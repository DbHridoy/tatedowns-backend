import { Types } from "mongoose";
import { apiError } from "../../errors/api-error";
import { Errors } from "../../constants/error-codes";
import { Job } from "../job/job.model";
import { Client } from "../client/client.model";
import { Quote } from "../quote/quote.model";
import { Crew } from "../crew/crew.model";
import { ProductionCalendarRepository } from "./production-calendar.repository";
import { createNotification, createNotificationsForUsers } from "../../utils/create-notification-utils";

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export class ProductionCalendarService {
  constructor(private readonly productionCalendarRepository: ProductionCalendarRepository) {}

  private buildSiteLocation = (client: any) => {
    return [client?.address, client?.city, client?.state, client?.zipCode]
      .filter(Boolean)
      .join(", ");
  };

  private getPainterIdsForCrew = (crew: any) =>
    (crew?.painters || []).map((p: any) => p._id?.toString?.() || p.toString());

  private sanitizeManagementSchedule = (item: any) => {
    const base = item.toObject ? item.toObject() : item;
    return base;
  };

  private sanitizePainterSchedule = (item: any) => {
    const base = item.toObject ? item.toObject() : item;
    const canPainterUpdateStatus = ["Not Started", "In Progress", "Delayed"].includes(
      base.status
    );
    return {
      _id: base._id,
      startDate: base.startDate,
      endDate: base.endDate,
      durationDays: base.durationDays,
      estimatedLaborHours: base.estimatedLaborHours,
      laborCapacityPerDay: base.laborCapacityPerDay,
      status: base.status,
      displayOrder: base.displayOrder,
      jobSiteLocation: base.jobSiteLocation,
      rainDelayHistory: base.rainDelayHistory || [],
      canPainterUpdateStatus,
      crew: base.crew
        ? {
            _id: base.crew._id,
            customCrewId: base.crew.customCrewId,
            name: base.crew.name,
            status: base.crew.status,
            painters: Array.isArray(base.crew.painters)
              ? base.crew.painters.map((painter: any) => ({
                  _id: painter._id,
                  fullName: painter.fullName,
                }))
              : [],
          }
        : null,
      job: base.job
        ? {
            _id: base.job._id,
            customJobId: base.job.customJobId,
            title: base.job.title,
            status: base.job.status,
          }
        : null,
      client: base.client
        ? {
            _id: base.client._id,
            clientName: base.client.clientName,
          }
        : null,
    };
  };

  private sanitizePainterCrew = (crew: any) => {
    if (!crew) {
      return null;
    }
    const base = crew.toObject ? crew.toObject() : crew;
    return {
      _id: base._id,
      customCrewId: base.customCrewId,
      name: base.name,
      status: base.status,
      painters: Array.isArray(base.painters)
        ? base.painters.map((painter: any) => ({
            _id: painter._id,
            fullName: painter.fullName,
            email: painter.email,
            role: painter.role,
            profileImage: painter.profileImage,
            isActive: painter.isActive,
          }))
        : [],
    };
  };

  getAvailableJobs = async () => {
    const scheduledItems = await this.productionCalendarRepository.getCalendarItems({});
    const scheduledJobIds = new Set(
      scheduledItems
        .filter((item: any) => item.status !== "Completed")
        .map((item: any) => item.job?._id?.toString?.() || item.job?.toString?.())
        .filter(Boolean)
    );

    const jobs = await Job.find({
      status: "Ready to Schedule",
      _id: { $nin: [...scheduledJobIds].map((id) => new Types.ObjectId(id)) },
    })
      .populate("clientId", "clientName address city state zipCode")
      .sort({ estimatedStartDate: 1, createdAt: -1 });

    return jobs.map((job: any) => ({
      _id: job._id,
      customJobId: job.customJobId,
      title: job.title,
      clientName: job.clientId?.clientName || null,
      jobSiteLocation: this.buildSiteLocation(job.clientId),
      laborHours: job.laborHours,
      setupCleanup: job.setupCleanup,
      powerwash: job.powerwash,
      totalHours: job.totalHours,
      estimatedStartDate: job.estimatedStartDate,
      status: job.status,
    }));
  };

  scheduleJob = async (payload: any, user: any) => {
    const [job, crew] = await Promise.all([
      Job.findById(payload.jobId).populate("clientId", "clientName address city state zipCode"),
      Crew.findById(payload.crewId).populate("painters", "_id fullName role"),
    ]);

    if (!job) {
      throw new apiError(Errors.NotFound.code, "Job not found");
    }
    if (!crew) {
      throw new apiError(Errors.NotFound.code, "Crew not found");
    }
    if (crew.status !== "Active") {
      throw new apiError(Errors.BadRequest.code, "Crew must be active");
    }
    if (job.status !== "Ready to Schedule" && job.status !== "Scheduled and Open") {
      throw new apiError(Errors.BadRequest.code, "Job is not available for scheduling");
    }

    const existingSchedules = await this.productionCalendarRepository.findSchedulesByJob(
      String(job._id)
    );
    if (existingSchedules.some((item: any) => item.status !== "Completed")) {
      throw new apiError(Errors.BadRequest.code, "Job already has an active schedule");
    }

    const laborCapacityPerDay = Number(payload.laborCapacityPerDay || 22);
    const estimatedLaborHours = Number(
      job.totalHours ||
        job.laborHours + job.setupCleanup + job.powerwash ||
        job.laborHours ||
        0
    );
    const durationDays = Number(
      payload.durationDays || Math.max(1, Math.ceil(estimatedLaborHours / laborCapacityPerDay))
    );
    const startDate = startOfDay(new Date(payload.startDate));
    const endDate = addDays(startDate, durationDays - 1);

    const item = await this.productionCalendarRepository.createScheduleItem({
      job: job._id,
      client: (job.clientId as any)._id,
      quote: job.quoteId,
      crew: crew._id,
      startDate,
      endDate,
      durationDays,
      estimatedLaborHours,
      laborCapacityPerDay,
      status: "Not Started",
      displayOrder: payload.displayOrder || 0,
      jobSiteLocation: this.buildSiteLocation(job.clientId),
      notes: payload.notes,
      createdBy: user.userId,
      updatedBy: user.userId,
    });

    if (job.status !== "Scheduled and Open") {
      await Job.findByIdAndUpdate(job._id, { status: "Scheduled and Open" });
    }

    const painterIds = this.getPainterIdsForCrew(crew);
    if (painterIds.length) {
      await createNotificationsForUsers({
        userIds: painterIds,
        type: "crew_scheduled",
        message: `Crew ${crew.name} has a new scheduled job`,
      });
    }
    if (job.salesRepId) {
      await createNotification({
        forUser: job.salesRepId.toString(),
        type: "job_status_updated",
        message: `Job status changed from ${job.status || "N/A"} to Scheduled and Open`,
      });
    }

    return this.productionCalendarRepository.getScheduleById(String(item._id));
  };

  getCalendar = async (query: any) => {
    const now = new Date();
    const startDate = query.startDate
      ? startOfDay(new Date(String(query.startDate)))
      : startOfDay(now);
    let endDate = query.endDate ? startOfDay(new Date(String(query.endDate))) : undefined;

    if (!endDate && query.viewMode) {
      const map: Record<string, number> = {
        twoWeeks: 13,
        month: 30,
        threeMonths: 89,
      };
      endDate = addDays(startDate, map[query.viewMode] || 13);
    }
    if (!endDate) {
      endDate = addDays(startDate, 13);
    }
    if (endDate < startDate) {
      throw new apiError(Errors.BadRequest.code, "endDate must be after startDate");
    }

    const items = await this.productionCalendarRepository.getCalendarItems({
      ...query,
      startDate,
      endDate,
    });
    const crews = await Crew.find(query.crewId ? { _id: query.crewId } : {})
      .select("customCrewId name status painters")
      .populate("painters", "fullName role");

    const utilization = crews.map((crew: any) => {
      const crewItems = items.filter((item: any) => String(item.crew?._id || item.crew) === String(crew._id));
      return {
        crewId: crew._id,
        crewName: crew.name,
        scheduledDays: crewItems.reduce((sum: number, item: any) => sum + Number(item.durationDays || 0), 0),
        activeJobs: crewItems.filter((item: any) => ["Not Started", "In Progress"].includes(item.status)).length,
        completedJobs: crewItems.filter((item: any) => item.status === "Completed").length,
        delayedJobs: crewItems.filter((item: any) => item.status === "Delayed").length,
      };
    });

    return {
      range: { startDate, endDate },
      crews,
      items: items.map((item: any) => this.sanitizeManagementSchedule(item)),
      utilization,
      stats: {
        totalScheduled: items.length,
        delayedJobs: items.filter((item: any) => item.status === "Delayed").length,
        completedJobs: items.filter((item: any) => item.status === "Completed").length,
      },
    };
  };

  updateSchedule = async (id: string, payload: any, user: any) => {
    const schedule = await this.productionCalendarRepository.getScheduleById(id);
    if (!schedule) {
      throw new apiError(Errors.NotFound.code, "Schedule item not found");
    }

    const nextPayload: any = {
      ...payload,
      updatedBy: user.userId,
    };
    if (payload.startDate || payload.durationDays || payload.endDate) {
      const startDate = payload.startDate
        ? startOfDay(new Date(String(payload.startDate)))
        : startOfDay(new Date(schedule.startDate));
      const durationDays = Number(payload.durationDays || schedule.durationDays);
      nextPayload.startDate = startDate;
      nextPayload.durationDays = durationDays;
      nextPayload.endDate = payload.endDate
        ? startOfDay(new Date(String(payload.endDate)))
        : addDays(startDate, durationDays - 1);
    }
    return this.productionCalendarRepository.updateScheduleItem(id, nextPayload);
  };

  updateScheduleStatus = async (id: string, status: string, user: any) => {
    const schedule = await this.productionCalendarRepository.getScheduleById(id);
    if (!schedule) {
      throw new apiError(Errors.NotFound.code, "Schedule item not found");
    }

    if (user.role === "Painter") {
      const crew = await Crew.findOne({
        _id: (schedule.crew as any)._id || schedule.crew,
        painters: user.userId,
      });
      if (!crew) {
        throw new apiError(Errors.Forbidden.code, Errors.Forbidden.message);
      }
      if (!["In Progress", "Completed"].includes(status)) {
        throw new apiError(Errors.Forbidden.code, "Painter cannot set this status");
      }
    }

    const updated = await this.productionCalendarRepository.updateScheduleItem(id, {
      status,
      updatedBy: user.userId,
    });

    if (updated?.crew) {
      const crew = await Crew.findById((updated.crew as any)._id || updated.crew).populate(
        "painters",
        "_id"
      );
      const painterIds = this.getPainterIdsForCrew(crew);
      if (painterIds.length && user.role !== "Painter") {
        await createNotificationsForUsers({
          userIds: painterIds,
          type: "schedule_status_updated",
          message: `Schedule status changed to ${status}`,
        });
      }
    }

    return updated;
  };

  applyRainDelay = async (scheduleItemId: string, payload: any, user: any) => {
    const schedule = await this.productionCalendarRepository.getScheduleById(scheduleItemId);
    if (!schedule) {
      throw new apiError(Errors.NotFound.code, "Schedule item not found");
    }
    const delayDays = Number(payload.delayDays);
    if (delayDays <= 0) {
      throw new apiError(Errors.BadRequest.code, "delayDays must be greater than 0");
    }

    const threshold = payload.affectedFromDate
      ? startOfDay(new Date(String(payload.affectedFromDate)))
      : startOfDay(new Date(schedule.startDate));
    const crewId = String((schedule.crew as any)._id || schedule.crew);
    const schedules = await this.productionCalendarRepository.findCrewSchedulesFromDate(
      crewId,
      threshold
    );

    for (const item of schedules) {
      const isTarget = String(item._id) === scheduleItemId;
      const startDate = startOfDay(new Date(item.startDate));
      const endDate = startOfDay(new Date(item.endDate));
      const update: any = { updatedBy: user.userId };

      if (isTarget) {
        if (threshold <= startDate) {
          update.startDate = addDays(startDate, delayDays);
          update.endDate = addDays(endDate, delayDays);
        } else {
          update.endDate = addDays(endDate, delayDays);
          update.durationDays = Number(item.durationDays || 0) + delayDays;
        }
        update.status = "Delayed";
        update.rainDelayHistory = [
          ...(item.rainDelayHistory || []),
          {
            delayDays,
            reason: payload.reason,
            appliedAt: new Date(),
            appliedBy: user.userId,
            affectedFromDate: threshold,
          },
        ];
      } else if (startDate >= threshold) {
        update.startDate = addDays(startDate, delayDays);
        update.endDate = addDays(endDate, delayDays);
      } else {
        continue;
      }

      await this.productionCalendarRepository.updateScheduleItem(String(item._id), update);
    }

    const crew = await Crew.findById(crewId).populate("painters", "_id");
    const painterIds = this.getPainterIdsForCrew(crew);
    if (painterIds.length) {
      await createNotificationsForUsers({
        userIds: painterIds,
        type: "schedule_rain_delayed",
        message: `Crew ${crew?.name || ""} schedule was shifted due to rain delay`,
      });
    }

    return this.productionCalendarRepository.getScheduleById(scheduleItemId);
  };

  getPainterOwnCrew = async (userId: string) => {
    const crew = await Crew.findOne({ painters: userId, status: "Active" })
      .populate("painters", "fullName email role profileImage isActive")
      .populate("createdBy updatedBy", "fullName email role");
    return this.sanitizePainterCrew(crew);
  };

  getPainterSchedule = async (userId: string, query: any) => {
    const crew = await this.getPainterOwnCrew(userId);
    if (!crew) {
      return [];
    }
    const items = await this.productionCalendarRepository.getCalendarItems({
      ...query,
      crewId: String(crew._id),
    });
    return items.map((item: any) => this.sanitizePainterSchedule(item));
  };
}

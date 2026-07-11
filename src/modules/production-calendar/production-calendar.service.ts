import { Types } from "mongoose";
import { apiError } from "../../errors/api-error";
import { Errors } from "../../constants/error-codes";
import { Job } from "../job/job.model";
import { Client } from "../client/client.model";
import { Quote } from "../quote/quote.model";
import { Crew } from "../crew/crew.model";
import { ProductionCalendarRepository } from "./production-calendar.repository";
import { createNotification, createNotificationsForUsers } from "../../utils/create-notification-utils";
import { buildJobCostSummary } from "../../utils/job-cost-utils";

const TERMINAL_SCHEDULE_STATUSES = new Set(["Pending Close", "Completed"]);
const ACTIVE_SCHEDULE_STATUSES = new Set([
  "Scheduled and Open",
  "Not Started",
  "In Progress",
  "Delayed",
]);

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
};

const parseCalendarDate = (value: string | Date) => {
  if (value instanceof Date) {
    return new Date(value);
  }

  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  }

  return new Date(String(value));
};

const startOfDay = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
const endOfDay = (date: Date) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const normalizeScheduleSegments = (item: any) => {
  const segments = Array.isArray(item?.scheduleSegments) && item.scheduleSegments.length
    ? item.scheduleSegments
    : [{ startDate: item.startDate, endDate: item.endDate }];

  return segments
    .map((segment: any) => ({
      startDate: startOfDay(new Date(segment.startDate)),
      endDate: endOfDay(new Date(segment.endDate)),
    }))
    .sort(
      (
        left: { startDate: Date; endDate: Date },
        right: { startDate: Date; endDate: Date }
      ) => left.startDate.getTime() - right.startDate.getTime()
    );
};

const summarizeScheduleSegments = (segments: Array<{ startDate: Date; endDate: Date }>) => {
  if (!segments.length) {
    return null;
  }

  const totalWorkingDays = segments.reduce((total, segment) => {
    const diff = segment.endDate.getTime() - segment.startDate.getTime();
    return total + Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
  }, 0);

  return {
    startDate: segments[0].startDate,
    endDate: segments[segments.length - 1].endDate,
    durationDays: totalWorkingDays,
  };
};

const shiftSegmentsFromDate = (
  item: any,
  threshold: Date,
  delayDays: number
) => {
  const segments = normalizeScheduleSegments(item);
  const shiftedSegments: Array<{ startDate: Date; endDate: Date }> = [];

  for (const segment of segments) {
    if (segment.endDate < threshold) {
      shiftedSegments.push(segment);
      continue;
    }

    if (segment.startDate >= threshold) {
      shiftedSegments.push({
        startDate: addDays(segment.startDate, delayDays),
        endDate: addDays(segment.endDate, delayDays),
      });
      continue;
    }

    const preservedEnd = addDays(threshold, -1);
    if (segment.startDate <= preservedEnd) {
      shiftedSegments.push({
        startDate: segment.startDate,
        endDate: preservedEnd,
      });
    }

    shiftedSegments.push({
      startDate: addDays(threshold, delayDays),
      endDate: addDays(segment.endDate, delayDays),
    });
  }

  const summary = summarizeScheduleSegments(shiftedSegments);
  if (!summary) {
    return null;
  }

  return {
    scheduleSegments: shiftedSegments,
    startDate: summary.startDate,
    endDate: summary.endDate,
    durationDays: summary.durationDays,
  };
};

const isDateWithinScheduleSegments = (item: any, targetDate: Date) => {
  const segments = normalizeScheduleSegments(item);
  return segments.some(
    (segment: { startDate: Date; endDate: Date }) =>
      targetDate >= segment.startDate && targetDate <= segment.endDate
  );
};

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
    return {
      ...base,
      costSummary: buildJobCostSummary({
        jobPrice: Number(base?.job?.price || 0),
        painterDailyHours: base?.painterDailyHours || [],
        materialExpenses: base?.materialExpenses || [],
      }),
    };
  };

  private sanitizePainterSchedule = (item: any) => {
    const base = item.toObject ? item.toObject() : item;
    const canPainterUpdateStatus = base.status === "Scheduled and Open";
    return {
      _id: base._id,
      startDate: base.startDate,
      endDate: base.endDate,
      durationDays: base.durationDays,
      estimatedLaborHours: base.estimatedLaborHours,
      laborCapacityPerDay: base.laborCapacityPerDay,
      status: base.status,
      scheduleSegments: base.scheduleSegments || [],
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
                  role: painter.role,
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
      painterDailyHours: Array.isArray(base.painterDailyHours)
        ? base.painterDailyHours.map((entry: any) => ({
            workDate: entry?.workDate,
            painterHours: Array.isArray(entry?.painterHours)
              ? entry.painterHours.map((painterEntry: any) => ({
                  painter: painterEntry?.painter
                    ? {
                        _id: painterEntry.painter._id,
                        fullName: painterEntry.painter.fullName,
                        role: painterEntry.painter.role,
                      }
                    : null,
                  hours: Number(painterEntry?.hours) || 0,
                }))
              : [],
          }))
        : [],
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
                  hourlyRate: Number(painter.hourlyRate || 0),
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
        .filter((item: any) => !TERMINAL_SCHEDULE_STATUSES.has(item.status))
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
    if (existingSchedules.some((item: any) => !TERMINAL_SCHEDULE_STATUSES.has(item.status))) {
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
    const startDate = startOfDay(parseCalendarDate(payload.startDate));
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
      status: "Scheduled and Open",
      scheduleSegments: [{ startDate, endDate }],
      displayOrder: payload.displayOrder || 0,
      jobSiteLocation: this.buildSiteLocation(job.clientId),
      notes: payload.notes,
      createdBy: user.userId,
      updatedBy: user.userId,
    });

    await Job.findByIdAndUpdate(job._id, {
      status: "Scheduled and Open",
      productionManagerId: user.userId,
      startDate,
    });

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
      ? startOfDay(parseCalendarDate(String(query.startDate)))
      : startOfDay(now);
    let endDate = query.endDate ? startOfDay(parseCalendarDate(String(query.endDate))) : undefined;

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
        activeJobs: crewItems.filter((item: any) => ACTIVE_SCHEDULE_STATUSES.has(item.status)).length,
        completedJobs: crewItems.filter((item: any) => TERMINAL_SCHEDULE_STATUSES.has(item.status)).length,
        delayedJobs: crewItems.filter((item: any) => (item.rainDelayHistory || []).length > 0).length,
      };
    });

    return {
      range: { startDate, endDate },
      crews,
      items: items.map((item: any) => this.sanitizeManagementSchedule(item)),
      utilization,
      stats: {
        totalScheduled: items.length,
        delayedJobs: items.filter((item: any) => (item.rainDelayHistory || []).length > 0).length,
        completedJobs: items.filter((item: any) => TERMINAL_SCHEDULE_STATUSES.has(item.status)).length,
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
        ? startOfDay(parseCalendarDate(String(payload.startDate)))
        : startOfDay(new Date(schedule.startDate));
      const durationDays = Number(payload.durationDays || schedule.durationDays);
      nextPayload.startDate = startDate;
      nextPayload.durationDays = durationDays;
      nextPayload.endDate = payload.endDate
        ? startOfDay(parseCalendarDate(String(payload.endDate)))
        : addDays(startDate, durationDays - 1);
      nextPayload.scheduleSegments = [
        {
          startDate: nextPayload.startDate,
          endDate: nextPayload.endDate,
        },
      ];
    }

    if (Array.isArray(payload.painterHours)) {
      if (!payload.workDate) {
        throw new apiError(Errors.BadRequest.code, "workDate is required for painter hours");
      }

      const workDate = startOfDay(parseCalendarDate(String(payload.workDate)));
      if (!isDateWithinScheduleSegments(schedule, workDate)) {
        throw new apiError(
          Errors.BadRequest.code,
          "Painter hours can only be recorded on scheduled work dates"
        );
      }

      const crewId = String((schedule.crew as any)?._id || schedule.crew);
      const crew = await Crew.findById(crewId).populate("painters", "_id fullName role");
      if (!crew) {
        throw new apiError(Errors.NotFound.code, "Crew not found");
      }

      const validPainterIds = new Set(
        (crew.painters || []).map((painter: any) => String(painter._id || painter))
      );
      const seenPainterIds = new Set<string>();

      const normalizedPainterHours = payload.painterHours.map((entry: any) => {
        const painterId = String(entry.painterId);
        if (!validPainterIds.has(painterId)) {
          throw new apiError(
            Errors.BadRequest.code,
            "Painter hours can only be recorded for painters assigned to this crew"
          );
        }
        if (seenPainterIds.has(painterId)) {
          throw new apiError(Errors.BadRequest.code, "Duplicate painter hours entry provided");
        }
        seenPainterIds.add(painterId);

        return {
          painter: painterId,
          hours: Number(entry.hours) || 0,
        };
      });

      const existingDailyHours = Array.isArray((schedule as any).painterDailyHours)
        ? (schedule as any).painterDailyHours.map((entry: any) => ({
            workDate: startOfDay(new Date(entry.workDate)),
            painterHours: Array.isArray(entry.painterHours) ? entry.painterHours : [],
          }))
        : [];

      const nextDailyHours = existingDailyHours.filter(
        (entry: any) => entry.workDate.getTime() !== workDate.getTime()
      );
      nextDailyHours.push({
        workDate,
        painterHours: normalizedPainterHours,
      });
      nextDailyHours.sort(
        (left: any, right: any) => left.workDate.getTime() - right.workDate.getTime()
      );

      nextPayload.painterDailyHours = nextDailyHours;
      delete nextPayload.painterHours;
      delete nextPayload.workDate;
    }

    if (Array.isArray(payload.materialExpenses)) {
      nextPayload.materialExpenses = payload.materialExpenses.map((entry: any) => ({
        description: String(entry.description || "").trim(),
        amount: Number(entry.amount) || 0,
        expenseDate: startOfDay(parseCalendarDate(String(entry.expenseDate))),
        note: entry.note ? String(entry.note).trim() : undefined,
      }));
    }

    const updated = await this.productionCalendarRepository.updateScheduleItem(id, nextPayload);
    if (!updated) {
      return updated;
    }

    const refreshed = await this.productionCalendarRepository.getScheduleById(id);
    return refreshed ? this.sanitizeManagementSchedule(refreshed) : refreshed;
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
      if (status !== "Pending Close") {
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

    if (!updated) {
      return updated;
    }

    const refreshed = await this.productionCalendarRepository.getScheduleById(id);
    if (!refreshed) {
      return refreshed;
    }

    return user.role === "Painter"
      ? this.sanitizePainterSchedule(refreshed)
      : this.sanitizeManagementSchedule(refreshed);
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
      ? startOfDay(parseCalendarDate(String(payload.affectedFromDate)))
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
        const shifted = shiftSegmentsFromDate(item, threshold, delayDays);
        if (shifted) {
          update.startDate = shifted.startDate;
          update.endDate = shifted.endDate;
          update.durationDays = shifted.durationDays;
          update.scheduleSegments = shifted.scheduleSegments;
        }
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
      } else if (endDate >= threshold) {
        const shifted = shiftSegmentsFromDate(item, threshold, delayDays);
        if (shifted) {
          update.startDate = shifted.startDate;
          update.endDate = shifted.endDate;
          update.durationDays = shifted.durationDays;
          update.scheduleSegments = shifted.scheduleSegments;
        }
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

    const refreshed = await this.productionCalendarRepository.getScheduleById(scheduleItemId);
    return refreshed ? this.sanitizeManagementSchedule(refreshed) : refreshed;
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

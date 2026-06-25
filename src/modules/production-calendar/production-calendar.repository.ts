import { Types } from "mongoose";
import { ProductionSchedule } from "./production-schedule.model";
import { buildDynamicSearch } from "../../utils/dynamic-search-utils";

export class ProductionCalendarRepository {
  createScheduleItem = async (payload: any) => {
    const item = new ProductionSchedule(payload);
    return item.save();
  };

  getScheduleById = async (id: string) => {
    return ProductionSchedule.findById(id)
      .populate("crew", "customCrewId name status painters")
      .populate("job", "customJobId title status totalHours laborHours setupCleanup powerwash price")
      .populate("client", "clientName address city state zipCode")
      .populate("quote", "estimatedPrice status")
      .populate("createdBy updatedBy", "fullName email role");
  };

  updateScheduleItem = async (id: string, payload: any) => {
    return ProductionSchedule.findByIdAndUpdate(id, payload, { new: true })
      .populate("crew", "customCrewId name status painters")
      .populate("job", "customJobId title status totalHours laborHours setupCleanup powerwash price")
      .populate("client", "clientName address city state zipCode")
      .populate("quote", "estimatedPrice status")
      .populate("createdBy updatedBy", "fullName email role");
  };

  getCalendarItems = async (query: any) => {
    const { filter, search } = buildDynamicSearch(ProductionSchedule, query);
    const finalFilter: any = { ...filter };
    if (query.crewId) {
      finalFilter.crew = new Types.ObjectId(String(query.crewId));
    }
    if (query.status) {
      finalFilter.status = query.status;
    }
    if (query.startDate || query.endDate) {
      finalFilter.startDate = {};
      if (query.startDate) {
        finalFilter.startDate.$gte = new Date(String(query.startDate));
      }
      if (query.endDate) {
        finalFilter.startDate.$lte = new Date(String(query.endDate));
      }
    }

    const items = await ProductionSchedule.find(finalFilter)
      .sort({ startDate: 1, displayOrder: 1, createdAt: 1 })
      .populate("crew", "customCrewId name status painters")
      .populate("job", "customJobId title status totalHours laborHours setupCleanup powerwash price")
      .populate("client", "clientName address city state zipCode")
      .populate("quote", "estimatedPrice status");

    if (!search?.$or?.length) {
      return items;
    }

    const searchTerm = String(query.search || "").toLowerCase();
    return items.filter((item: any) => {
      const values = [
        item.job?.customJobId,
        item.job?.title,
        item.client?.clientName,
        item.jobSiteLocation,
        item.crew?.name,
      ].filter(Boolean);
      return values.some((value) => String(value).toLowerCase().includes(searchTerm));
    });
  };

  findCrewSchedulesFromDate = async (crewId: string, fromDate: Date) => {
    return ProductionSchedule.find({
      crew: crewId,
      $or: [
        { startDate: { $gte: fromDate } },
        { endDate: { $gte: fromDate } },
      ],
    }).sort({ startDate: 1, displayOrder: 1, createdAt: 1 });
  };

  findSchedulesByJob = async (jobId: string) => {
    return ProductionSchedule.find({ job: jobId });
  };
}

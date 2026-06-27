import { Types } from "mongoose";
import { ProductionSchedule } from "./production-schedule.model";
import { buildDynamicSearch } from "../../utils/dynamic-search-utils";

const parseCalendarDate = (value: string | Date) => {
  if (value instanceof Date) {
    return new Date(value);
  }

  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  return new Date(String(value));
};

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
    const {
      startDate: _startDate,
      endDate: _endDate,
      viewMode: _viewMode,
      crewId: _crewId,
      ...filterableQuery
    } = query || {};
    const { filter, search } = buildDynamicSearch(ProductionSchedule, filterableQuery);
    const finalFilter: any = { ...filter };
    if (query.crewId) {
      finalFilter.crew = new Types.ObjectId(String(query.crewId));
    }
    if (query.status) {
      finalFilter.status = query.status;
    }
    if (query.startDate || query.endDate) {
      const rangeStart = query.startDate ? parseCalendarDate(String(query.startDate)) : null;
      const rangeEnd = query.endDate ? parseCalendarDate(String(query.endDate)) : null;

      if (rangeStart && rangeEnd) {
        finalFilter.$and = [
          ...(finalFilter.$and || []),
          { startDate: { $lte: rangeEnd } },
          { endDate: { $gte: rangeStart } },
        ];
      } else if (rangeStart) {
        finalFilter.endDate = { $gte: rangeStart };
      } else if (rangeEnd) {
        finalFilter.startDate = { $lte: rangeEnd };
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

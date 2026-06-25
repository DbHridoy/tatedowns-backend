import { Types } from "mongoose";
import { Crew } from "./crew.model";
import { buildDynamicSearch } from "../../utils/dynamic-search-utils";
import { ProductionSchedule } from "../production-calendar/production-schedule.model";

export class CrewRepository {
  getCrews = async (query: any) => {
    const { filter, search, options } = buildDynamicSearch(Crew, query);
    const [data, total] = await Promise.all([
      Crew.find({ ...filter, ...search }, null, options)
        .populate("painters", "-password")
        .populate("createdBy updatedBy", "fullName email role"),
      Crew.countDocuments({ ...filter, ...search }),
    ]);
    return { data, total };
  };

  getCrewById = async (id: string) => {
    return Crew.findById(id)
      .populate("painters", "-password")
      .populate("createdBy updatedBy", "fullName email role");
  };

  createCrew = async (payload: any) => {
    const crew = new Crew(payload);
    return crew.save();
  };

  updateCrew = async (id: string, payload: any) => {
    return Crew.findByIdAndUpdate(id, payload, { new: true })
      .populate("painters", "-password")
      .populate("createdBy updatedBy", "fullName email role");
  };

  findActiveCrewByPainter = async (painterId: string, excludeCrewId?: string) => {
    const filter: any = {
      status: "Active",
      painters: new Types.ObjectId(painterId),
    };
    if (excludeCrewId) {
      filter._id = { $ne: new Types.ObjectId(excludeCrewId) };
    }
    return Crew.findOne(filter);
  };

  hasSchedules = async (crewId: string) => {
    return ProductionSchedule.exists({ crew: crewId });
  };

  getCrewCurrentAssignments = async (crewId: string, date = new Date()) => {
    return ProductionSchedule.find({
      crew: crewId,
      startDate: { $lte: date },
      endDate: { $gte: date },
      status: { $in: ["Not Started", "In Progress", "Delayed"] },
    })
      .populate("job", "customJobId title status")
      .populate("client", "clientName address city state zipCode");
  };
}

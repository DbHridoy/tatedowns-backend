import User from "../user/user.model";
import { apiError } from "../../errors/api-error";
import { Errors } from "../../constants/error-codes";
import { CrewRepository } from "./crew.repository";
import { ProductionSchedule } from "../production-calendar/production-schedule.model";

export class CrewService {
  constructor(private readonly crewRepository: CrewRepository) {}

  private ensurePainterUsers = async (painterIds: string[], crewId?: string) => {
    if (!painterIds?.length) {
      return;
    }
    const painters = await User.find({
      _id: { $in: painterIds },
      role: "Painter",
    }).select("_id role isActive");

    if (painters.length !== painterIds.length) {
      throw new apiError(Errors.BadRequest.code, "Only users with role Painter can be assigned");
    }

    for (const painterId of painterIds) {
      const activeCrew = await this.crewRepository.findActiveCrewByPainter(
        painterId,
        crewId
      );
      if (activeCrew) {
        throw new apiError(
          Errors.BadRequest.code,
          `Painter already belongs to active crew ${activeCrew.name}`
        );
      }
    }
  };

  createCrew = async (payload: any, userId: string) => {
    const uniquePainters = [...new Set((payload.painters || []) as string[])];
    await this.ensurePainterUsers(uniquePainters);
    return this.crewRepository.createCrew({
      ...payload,
      painters: uniquePainters,
      createdBy: userId,
      updatedBy: userId,
    });
  };

  getCrews = async (query: any) => {
    return this.crewRepository.getCrews(query);
  };

  getCrewById = async (id: string) => {
    const crew = await this.crewRepository.getCrewById(id);
    if (!crew) {
      throw new apiError(Errors.NotFound.code, "Crew not found");
    }
    return crew;
  };

  updateCrew = async (id: string, payload: any, userId: string) => {
    const crew = await this.getCrewById(id);
    const mergedPainters = payload.painters
      ? [...new Set(payload.painters as string[])]
      : crew.painters.map((p: any) => p._id?.toString?.() || p.toString());
    await this.ensurePainterUsers(mergedPainters, id);
    const updated = await this.crewRepository.updateCrew(id, {
      ...payload,
      painters: mergedPainters,
      updatedBy: userId,
    });
    if (!updated) {
      throw new apiError(Errors.NotFound.code, "Crew not found");
    }
    return updated;
  };

  deactivateCrew = async (id: string, userId: string) => {
    await this.getCrewById(id);
    return this.crewRepository.updateCrew(id, {
      status: "Inactive",
      updatedBy: userId,
    });
  };

  assignPainter = async (crewId: string, painterId: string, userId: string) => {
    const crew = await this.getCrewById(crewId);
    if (crew.status !== "Active") {
      throw new apiError(Errors.BadRequest.code, "Cannot assign painters to an inactive crew");
    }
    await this.ensurePainterUsers([painterId], crewId);
    const existingPainterIds = crew.painters.map((p: any) =>
      p._id?.toString?.() || p.toString()
    );
    if (existingPainterIds.includes(painterId)) {
      throw new apiError(Errors.BadRequest.code, "Painter is already assigned to this crew");
    }
    return this.crewRepository.updateCrew(crewId, {
      painters: [...existingPainterIds, painterId],
      updatedBy: userId,
    });
  };

  removePainter = async (crewId: string, painterId: string, userId: string) => {
    const crew = await this.getCrewById(crewId);
    const nextPainters = crew.painters
      .map((p: any) => p._id?.toString?.() || p.toString())
      .filter((id: string) => id !== painterId);
    return this.crewRepository.updateCrew(crewId, {
      painters: nextPainters,
      updatedBy: userId,
    });
  };

  getCrewSchedule = async (crewId: string, query: any) => {
    await this.getCrewById(crewId);
    const filter: any = { crew: crewId };
    if (query.startDate || query.endDate) {
      filter.startDate = {};
      if (query.startDate) {
        filter.startDate.$gte = new Date(String(query.startDate));
      }
      if (query.endDate) {
        filter.startDate.$lte = new Date(String(query.endDate));
      }
    }
    return ProductionSchedule.find(filter)
      .sort({ startDate: 1, displayOrder: 1, createdAt: 1 })
      .populate("crew", "customCrewId name status")
      .populate("job", "customJobId title status")
      .populate("client", "clientName address city state zipCode");
  };

  getCrewCurrentAssignments = async (crewId: string) => {
    await this.getCrewById(crewId);
    return this.crewRepository.getCrewCurrentAssignments(crewId);
  };
}

import { apiError } from "../../errors/api-error";
import { Errors } from "../../constants/error-codes";
import { UserService } from "../user/user.service";
import User from "../user/user.model";
import { Crew } from "../crew/crew.model";
import { ProductionCalendarService } from "../production-calendar/production-calendar.service";
import { HashUtils } from "../../utils/hash-utils";

export class PainterService {
  constructor(
    private readonly userService: UserService,
    private readonly productionCalendarService: ProductionCalendarService,
    private readonly hashUtils: HashUtils
  ) {}

  private sanitizePainter = (user: any, crew?: any) => {
    if (!user) {
      return null;
    }
    return {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      address: user.address,
      profileImage: user.profileImage,
      role: user.role,
      isActive: user.isActive ?? true,
      crew: crew
        ? {
            _id: crew._id,
            customCrewId: crew.customCrewId,
            name: crew.name,
            status: crew.status,
          }
        : null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  };

  createPainter = async (payload: any) => {
    const user = await this.userService.createUser({
      ...payload,
      role: "Painter",
    });
    return this.sanitizePainter(user);
  };

  getPainters = async (query: any) => {
    const users = await User.find({ role: "Painter", ...("isActive" in query ? { isActive: query.isActive === "true" } : {}) })
      .select("-password")
      .sort({ createdAt: -1 });
    const crews = await Crew.find({ painters: { $in: users.map((user) => user._id) } }).select(
      "customCrewId name status painters"
    );
    const crewByPainter = new Map<string, any>();
    crews.forEach((crew: any) => {
      crew.painters.forEach((painterId: any) => {
        crewByPainter.set(String(painterId), crew);
      });
    });
    return {
      data: users.map((user: any) => this.sanitizePainter(user, crewByPainter.get(String(user._id)))),
      total: users.length,
    };
  };

  getPainterById = async (id: string) => {
    const user = await User.findOne({ _id: id, role: "Painter" }).select("-password");
    if (!user) {
      throw new apiError(Errors.NotFound.code, "Painter not found");
    }
    const crew = await Crew.findOne({ painters: id, status: "Active" }).select(
      "customCrewId name status"
    );
    return this.sanitizePainter(user, crew);
  };

  updatePainter = async (id: string, payload: any) => {
    const nextPayload = { ...payload };
    if (nextPayload.password) {
      nextPayload.password = await this.hashUtils.hashPassword(nextPayload.password);
    }
    const user = await User.findOneAndUpdate({ _id: id, role: "Painter" }, nextPayload, {
      new: true,
    }).select("-password");
    if (!user) {
      throw new apiError(Errors.NotFound.code, "Painter not found");
    }
    const crew = await Crew.findOne({ painters: id, status: "Active" }).select(
      "customCrewId name status"
    );
    return this.sanitizePainter(user, crew);
  };

  getMyCrew = async (userId: string) => {
    return this.productionCalendarService.getPainterOwnCrew(userId);
  };

  getMySchedule = async (userId: string, query: any) => {
    return this.productionCalendarService.getPainterSchedule(userId, query);
  };
}

import { apiError } from "../../errors/api-error";
import { Errors } from "../../constants/error-codes";
import { UserService } from "../user/user.service";
import User from "../user/user.model";
import { Crew } from "../crew/crew.model";
import { ProductionCalendarService } from "../production-calendar/production-calendar.service";
import { HashUtils } from "../../utils/hash-utils";
import { ProductionSchedule } from "../production-calendar/production-schedule.model";

export class PainterService {
  constructor(
    private readonly userService: UserService,
    private readonly productionCalendarService: ProductionCalendarService,
    private readonly hashUtils: HashUtils
  ) {}

  private sanitizePainter = (
    user: any,
    crew?: any,
    totalWorkedHours = 0,
    dailyWorkedHours: Array<{ workDate: string; hours: number }> = []
  ) => {
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
      totalWorkedHours,
      dailyWorkedHours,
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

  private getWorkedHoursSummary = async (painterIds: any[]) => {
    if (!painterIds.length) {
      return {
        totalHoursByPainter: new Map<string, number>(),
        dailyHoursByPainter: new Map<string, Array<{ workDate: string; hours: number }>>(),
      };
    }

    const workedHoursTotals = await ProductionSchedule.aggregate([
      { $unwind: { path: "$painterDailyHours", preserveNullAndEmptyArrays: false } },
      { $unwind: { path: "$painterDailyHours.painterHours", preserveNullAndEmptyArrays: false } },
      {
        $match: {
          "painterDailyHours.painterHours.painter": { $in: painterIds },
        },
      },
      {
        $group: {
          _id: "$painterDailyHours.painterHours.painter",
          totalWorkedHours: { $sum: "$painterDailyHours.painterHours.hours" },
        },
      },
    ]);

    const totalHoursByPainter = new Map<string, number>();
    workedHoursTotals.forEach((entry: any) => {
      totalHoursByPainter.set(String(entry._id), Number(entry.totalWorkedHours) || 0);
    });

    const workedHoursByDate = await ProductionSchedule.aggregate([
      { $unwind: { path: "$painterDailyHours", preserveNullAndEmptyArrays: false } },
      { $unwind: { path: "$painterDailyHours.painterHours", preserveNullAndEmptyArrays: false } },
      {
        $match: {
          "painterDailyHours.painterHours.painter": { $in: painterIds },
        },
      },
      {
        $group: {
          _id: {
            painter: "$painterDailyHours.painterHours.painter",
            workDate: "$painterDailyHours.workDate",
          },
          hours: { $sum: "$painterDailyHours.painterHours.hours" },
        },
      },
      {
        $sort: {
          "_id.workDate": 1,
        },
      },
    ]);

    const dailyHoursByPainter = new Map<string, Array<{ workDate: string; hours: number }>>();
    workedHoursByDate.forEach((entry: any) => {
      const painterId = String(entry._id.painter);
      const current = dailyHoursByPainter.get(painterId) || [];
      current.push({
        workDate: new Date(entry._id.workDate).toISOString().slice(0, 10),
        hours: Number(entry.hours) || 0,
      });
      dailyHoursByPainter.set(painterId, current);
    });

    return {
      totalHoursByPainter,
      dailyHoursByPainter,
    };
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

    const painterIds = users.map((user) => user._id);
    const { totalHoursByPainter, dailyHoursByPainter } =
      await this.getWorkedHoursSummary(painterIds);

    return {
      data: users.map((user: any) =>
        this.sanitizePainter(
          user,
          crewByPainter.get(String(user._id)),
          totalHoursByPainter.get(String(user._id)) || 0,
          dailyHoursByPainter.get(String(user._id)) || []
        )
      ),
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
    const { totalHoursByPainter, dailyHoursByPainter } = await this.getWorkedHoursSummary([
      user._id,
    ]);
    return this.sanitizePainter(
      user,
      crew,
      totalHoursByPainter.get(String(user._id)) || 0,
      dailyHoursByPainter.get(String(user._id)) || []
    );
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

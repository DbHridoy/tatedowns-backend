import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { HttpCodes } from "../../constants/status-codes";
import { CrewService } from "./crew.service";

export class CrewController {
  constructor(private readonly crewService: CrewService) {}

  createCrew = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const data = await this.crewService.createCrew(req.body, req.user!.userId);
    res.status(HttpCodes.Ok).json({
      success: true,
      message: "Crew created successfully",
      data,
    });
  });

  getCrews = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const crews = await this.crewService.getCrews(req.query);
    res.status(HttpCodes.Ok).json({
      success: true,
      message: "Crews fetched successfully",
      data: crews.data,
      total: crews.total,
    });
  });

  getCrewById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const data = await this.crewService.getCrewById(String(req.params.id));
    res.status(HttpCodes.Ok).json({
      success: true,
      message: "Crew fetched successfully",
      data,
    });
  });

  updateCrew = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const data = await this.crewService.updateCrew(
      String(req.params.id),
      req.body,
      req.user!.userId
    );
    res.status(HttpCodes.Ok).json({
      success: true,
      message: "Crew updated successfully",
      data,
    });
  });

  deleteCrew = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const data = await this.crewService.deactivateCrew(String(req.params.id), req.user!.userId);
    res.status(HttpCodes.Ok).json({
      success: true,
      message: "Crew deactivated successfully",
      data,
    });
  });

  assignPainter = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const data = await this.crewService.assignPainter(
      String(req.params.id),
      req.body.painterId,
      req.user!.userId
    );
    res.status(HttpCodes.Ok).json({
      success: true,
      message: "Painter assigned successfully",
      data,
    });
  });

  removePainter = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const data = await this.crewService.removePainter(
      String(req.params.id),
      String(req.params.painterId),
      req.user!.userId
    );
    res.status(HttpCodes.Ok).json({
      success: true,
      message: "Painter removed successfully",
      data,
    });
  });

  getCrewSchedule = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const data = await this.crewService.getCrewSchedule(String(req.params.id), req.query);
    res.status(HttpCodes.Ok).json({
      success: true,
      message: "Crew schedule fetched successfully",
      data,
    });
  });

  getCrewCurrentAssignments = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const data = await this.crewService.getCrewCurrentAssignments(String(req.params.id));
      res.status(HttpCodes.Ok).json({
        success: true,
        message: "Crew current assignments fetched successfully",
        data,
      });
    }
  );
}

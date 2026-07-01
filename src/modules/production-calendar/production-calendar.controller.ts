import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { HttpCodes } from "../../constants/status-codes";
import { ProductionCalendarService } from "./production-calendar.service";

export class ProductionCalendarController {
  constructor(private readonly productionCalendarService: ProductionCalendarService) {}

  getCalendar = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const data = await this.productionCalendarService.getCalendar(req.query);
    res.status(HttpCodes.Ok).json({
      success: true,
      message: "Production calendar fetched successfully",
      data,
    });
  });

  getAvailableJobs = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const data = await this.productionCalendarService.getAvailableJobs();
    res.status(HttpCodes.Ok).json({
      success: true,
      message: "Available jobs fetched successfully",
      data,
    });
  });

  scheduleJob = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const data = await this.productionCalendarService.scheduleJob(req.body, req.user!);
    res.status(HttpCodes.Ok).json({
      success: true,
      message: "Job scheduled successfully",
      data,
    });
  });

  updateSchedule = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const data = await this.productionCalendarService.updateSchedule(
      String(req.params.id),
      req.body,
      req.user!
    );
    res.status(HttpCodes.Ok).json({
      success: true,
      message: "Schedule updated successfully",
      data,
    });
  });

  updateScheduleStatus = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const data = await this.productionCalendarService.updateScheduleStatus(
        String(req.params.id),
        req.body.status,
        req.user!
      );
      res.status(HttpCodes.Ok).json({
        success: true,
        message: "Schedule status updated successfully",
        data,
      });
    }
  );

  applyRainDelay = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const data = await this.productionCalendarService.applyRainDelay(
        String(req.params.id),
      req.body,
      req.user!
    );
    res.status(HttpCodes.Ok).json({
      success: true,
      message: "Rain delay applied successfully",
      data,
    });
  });
}

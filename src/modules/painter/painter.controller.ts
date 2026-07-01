import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { HttpCodes } from "../../constants/status-codes";
import { PainterService } from "./painter.service";

export class PainterController {
  constructor(private readonly painterService: PainterService) {}

  createPainter = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const data = await this.painterService.createPainter(req.body);
    res.status(HttpCodes.Ok).json({
      success: true,
      message: "Painter created successfully",
      data,
    });
  });

  getPainters = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const result = await this.painterService.getPainters(req.query);
    res.status(HttpCodes.Ok).json({
      success: true,
      message: "Painters fetched successfully",
      data: result.data,
      total: result.total,
    });
  });

  getPainterById = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const data = await this.painterService.getPainterById(String(req.params.id));
    res.status(HttpCodes.Ok).json({
      success: true,
      message: "Painter fetched successfully",
      data,
    });
  });

  updatePainter = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const data = await this.painterService.updatePainter(String(req.params.id), req.body);
    res.status(HttpCodes.Ok).json({
      success: true,
      message: "Painter updated successfully",
      data,
    });
  });

  getMyCrew = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const data = await this.painterService.getMyCrew(req.user!.userId);
    res.status(HttpCodes.Ok).json({
      success: true,
      message: "My crew fetched successfully",
      data,
    });
  });

  getMySchedule = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const data = await this.painterService.getMySchedule(req.user!.userId, req.query);
    res.status(HttpCodes.Ok).json({
      success: true,
      message: "My schedule fetched successfully",
      data,
    });
  });
}

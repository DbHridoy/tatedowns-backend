import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { ExpenseService } from "./expense.service";
import { logger } from "../../utils/logger";

export class ExpenseController {
  constructor(private expenseService: ExpenseService) {}

  createNewMileage = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      logger.info({ body: req.body }, "Requestbody from expense controller");
      logger.info(req.file, "File from expense controller");
      const { salesRepId, month, year, totalMilesDriven, note } = req.body;
      const body = req.body;

      logger.info({ body }, "Requestbody from expense controller");

      // uploaded file (from multer)
      const file = req.file?.fileUrl;
      if (!file) {
        return res.status(400).json({ message: "File is required" });
      }

      const mileage = await this.expenseService.createNewMileage({
        salesRepId,
        month,
        year,
        totalMilesDriven,
        file,
        note,
      });

      res.status(201).json({
        success: true,
        message: "Mileage created successfully",
        data: mileage,
      });
    }
  );

  getAllMileage = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const queries = req.query;
      const allMileage = await this.expenseService.getAllMileage(queries);
      return res.status(200).json({
        success: true,
        message: "All mileage fetched successfully",
        data: allMileage.data,
        total: allMileage.total,
      });
    }
  );

  getMyMileage = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const userId = req.user!.userId;
      const { query } = req;
      const mileage = await this.expenseService.getMyMileage(userId, query);
      return res.status(200).json({
        success: true,
        message: "Mileage fetched successfully",
        data: mileage.data,
        total: mileage.total,
        totalMilesDriven: mileage.totalMilesDriven,
        totalDeduction: mileage.totalDeduction,
      });
    }
  );

  getMileageById = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const mileageId = String(req.params.mileageId);
      const mileage = await this.expenseService.getMileageById(mileageId);
      return res.status(200).json({
        success: true,
        message: "Mileage fetched successfully",
        data: mileage,
      });
    }
  );

  getPendingMileage = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const pendingMileage = await this.expenseService.getPendingMileage(
        req.query
      );
      return res.status(200).json({
        success: true,
        message: "Pending mileage fetched successfully",
        data: pendingMileage.data,
        total: pendingMileage.total,
      });
    }
  );

  updateMileage = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const updatedMileage = await this.expenseService.updateMileage(
        String(req.params.mileageId),
        req.body
      );
      return res.status(200).json({
        success: true,
        message: "Mileage updated successfully",
        data: updatedMileage,
      });
    }
  );
}

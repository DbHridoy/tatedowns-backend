import { CommonService } from "./common.service";
import { asyncHandler } from "../../utils/async-handler";
import { Request, Response, NextFunction } from "express";
import { HttpCodes } from "../../constants/status-codes";
import { logger } from "../../utils/logger";
import { CommonRepository } from "./common.repository";

const getPeriodParams = (query: any) => {
  const { periodType, date } = query || {};
  const normalizedPeriod = periodType
    ? String(periodType).toLowerCase()
    : undefined;
  if (
    normalizedPeriod &&
    !["day", "week", "month", "year"].includes(normalizedPeriod)
  ) {
    return { error: "Invalid periodType" };
  }
  const baseDate = date ? new Date(String(date)) : new Date();
  if (normalizedPeriod && Number.isNaN(baseDate.getTime())) {
    return { error: "Invalid date" };
  }
  return {
    periodType: normalizedPeriod,
    date: normalizedPeriod ? baseDate : undefined,
  };
};

export class CommonController {
  constructor(
    private commonService: CommonService,
    private commonRepository: CommonRepository
  ) { }

  generateSequentialId = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { prefix, counterName } = req.body;
      const id = await this.commonService.generateSequentialId(
        prefix,
        counterName
      );
      return res.status(200).json({ success: true, data: id });
    }
  );

  createCluster = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { clusterName } = req.body;
      logger.info({ clusterName }, "CommonController.createCluster");
      const cluster = await this.commonService.createCluster(clusterName);
      return res.status(200).json({ success: true, data: cluster });
    }
  );

  getVariable = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const variable = await this.commonService.getVariable();
      return res.status(200).json({ success: true, data: variable });
    }
  );

  upsertVariable = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const variables = req.body;
      const variable = await this.commonService.upsertVariable(variables);
      return res.status(200).json({ success: true, data: variable });
    }
  );

  getCluster = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const clusters = await this.commonService.getCluster();
      return res.status(200).json({
        success: true,
        message: "Clusters fetched successfully",
        data: clusters,
      });
    }
  );

  getNotification = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const q = req.query;
      const notifications = await this.commonService.getNotification(q);
      res.status(HttpCodes.Ok).send({
        success: true,
        message: "Notification fetched successfully",
        data: notifications,
      });
    }
  );

  getMyNotifications = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user!;
      const q = { ...req.query, forUser: user.userId };
      const notifications = await this.commonService.getNotification(q);
      res.status(HttpCodes.Ok).send({
        success: true,
        message: "My notifications fetched successfully",
        data: notifications,
      });
    }
  );

  updateNotificationRead = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user!;
      const notificationId = String(req.params.notificationId);
      const updatedNotification = await this.commonService.markNotificationRead(
        notificationId,
        user.userId
      );
      res.status(HttpCodes.Ok).send({
        success: true,
        message: "Notification updated successfully",
        data: updatedNotification,
      });
    }
  );
  getAdminStats = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { error, periodType, date } = getPeriodParams(req.query);
      if (error) {
        return res.status(400).json({ message: error });
      }
      const stats = await this.commonService.getAdminStats(periodType, date);
      res.status(200).json({
        success: true,
        message: "Admin stats retrieved successfully",
        data: stats,
      });
    }
  );

  getSummaryStats = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { error, periodType, date } = getPeriodParams(req.query);
      if (error) {
        return res.status(400).json({ message: error });
      }
      const stats = await this.commonService.getSummaryStats(periodType, date);
      res.status(200).json({
        success: true,
        message: "Summary stats retrieved successfully",
        data: stats,
      });
    }
  );
  getSalesRepLeaderboard = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { periodType, date } = req.query;
      const normalizedPeriod = periodType
        ? String(periodType).toLowerCase()
        : undefined;
      if (
        normalizedPeriod &&
        !["day", "week", "month", "year"].includes(normalizedPeriod)
      ) {
        return res.status(400).json({ message: "Invalid periodType" });
      }

      const baseDate = date ? new Date(String(date)) : new Date();
      if (normalizedPeriod && Number.isNaN(baseDate.getTime())) {
        return res.status(400).json({ message: "Invalid date" });
      }

      const stats = await this.commonService.getSalesRepLeaderboard(
        normalizedPeriod,
        normalizedPeriod ? baseDate : undefined
      );
      res.status(200).json({
        success: true,
        message: "Sales rep leaderboard retrieved successfully",
        data: stats,
      });
    }
  );

  getMyStats = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user!;
      const { error, periodType, date } = getPeriodParams(req.query);
      if (error) {
        return res.status(400).json({ message: error });
      }
      const stats = await this.commonService.getMyStats(
        user,
        periodType,
        date
      );
      res.status(200).json({
        success: true,
        message: "My stats retrieved successfully",
        data: stats,
      });
    }
  );

  getUserStatsById = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const userId = String(req.params.userId);
      const { error, periodType, date } = getPeriodParams(req.query);
      if (error) {
        return res.status(400).json({ message: error });
      }
      const stats = await this.commonService.getUserStatsById(
        userId,
        periodType,
        date
      );
      res.status(200).json({
        success: true,
        message: "User stats retrieved successfully",
        data: stats,
      });
    }
  );
  getSalesRepStats = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const salesRepId = String(req.params.salesRepId);
      const { error, periodType, date } = getPeriodParams(req.query);
      if (error) {
        return res.status(400).json({ message: error });
      }
      const stats = await this.commonService.getSalesRepStats(
        salesRepId,
        periodType,
        date
      );
      res.status(200).json({
        success: true,
        message: "Sales rep stats retrieved successfully",
        data: stats,
      });
    }
  );

  getSalesRepPeriodStats = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const userId = String(req.params.userId);
      const { periodType = "month", date } = req.query;

      const normalizedPeriod = String(periodType).toLowerCase();
      if (!["day", "week", "month", "year"].includes(normalizedPeriod)) {
        return res.status(400).json({ message: "Invalid periodType" });
      }

      const baseDate = date ? new Date(String(date)) : new Date();
      if (Number.isNaN(baseDate.getTime())) {
        return res.status(400).json({ message: "Invalid date" });
      }

      const stats = await this.commonService.getSalesRepPeriodStats(
        userId,
        normalizedPeriod,
        baseDate
      );
      res.status(200).json({
        success: true,
        message: "Sales rep period stats retrieved successfully",
        data: stats,
      });
    }
  );

  addPayment = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const payment = await this.commonService.createSalesRepPayment(req.body);
      res.status(201).json({
        success: true,
        message: "Payment created successfully",
        data: payment,
      });
    }
  );

  getPayments = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user!;
      const salesRepId =
        user.role === "Admin"
          ? String(req.query.salesRepId || "")
          : user.userId;
      if (user.role === "Admin" && !salesRepId) {
        return res.status(400).json({
          success: false,
          message: "salesRepId is required",
        });
      }
      const payments = await this.commonService.getSalesRepPayments(
        salesRepId,
        req.query
      );
      res.status(200).json({
        success: true,
        message: "Payments fetched successfully",
        data: payments.data,
        total: payments.total,
      });
    }
  );

  deletePayment = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const paymentId = String(req.params.paymentId);
      const payment = await this.commonService.deleteSalesRepPayment(paymentId);
      res.status(200).json({
        success: true,
        message: "Payment deleted successfully",
        data: payment,
      });
    }
  );

  updatePayment = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const paymentId = String(req.params.paymentId);
      const payment = await this.commonService.updateSalesRepPayment(
        paymentId,
        req.body
      );
      res.status(200).json({
        success: true,
        message: "Payment updated successfully",
        data: payment,
      });
    }
  );


}

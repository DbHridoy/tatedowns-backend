import { Router } from "express";
import { authMiddleware, productionCalendarController } from "../../container";
import { validate } from "../../middlewares/validate.middleware";
import {
  RainDelaySchema,
  ScheduleJobSchema,
  UpdateScheduleSchema,
  UpdateScheduleStatusSchema,
} from "./production-calendar.schema";

const productionCalendarRoute = Router();

productionCalendarRoute.use(authMiddleware.authenticate);

productionCalendarRoute.get(
  "/",
  authMiddleware.authorize(["Production Manager", "Admin"]),
  productionCalendarController.getCalendar
);
productionCalendarRoute.get(
  "/available-jobs",
  authMiddleware.authorize(["Production Manager", "Admin"]),
  productionCalendarController.getAvailableJobs
);
productionCalendarRoute.post(
  "/schedule",
  authMiddleware.authorize(["Production Manager", "Admin"]),
  validate(ScheduleJobSchema),
  productionCalendarController.scheduleJob
);
productionCalendarRoute.patch(
  "/:id",
  authMiddleware.authorize(["Production Manager", "Admin"]),
  validate(UpdateScheduleSchema),
  productionCalendarController.updateSchedule
);
productionCalendarRoute.patch(
  "/:id/status",
  authMiddleware.authorize(["Production Manager", "Admin"]),
  validate(UpdateScheduleStatusSchema),
  productionCalendarController.updateScheduleStatus
);
productionCalendarRoute.post(
  "/:id/rain-delay",
  authMiddleware.authorize(["Production Manager", "Admin"]),
  validate(RainDelaySchema),
  productionCalendarController.applyRainDelay
);

export default productionCalendarRoute;

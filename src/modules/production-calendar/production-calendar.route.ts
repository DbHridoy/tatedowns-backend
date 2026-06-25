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
  authMiddleware.authorize(["Admin", "Production Manager"]),
  productionCalendarController.getCalendar
);
productionCalendarRoute.get(
  "/available-jobs",
  authMiddleware.authorize(["Admin", "Production Manager"]),
  productionCalendarController.getAvailableJobs
);
productionCalendarRoute.post(
  "/schedule",
  authMiddleware.authorize(["Admin", "Production Manager"]),
  validate(ScheduleJobSchema),
  productionCalendarController.scheduleJob
);
productionCalendarRoute.patch(
  "/:id",
  authMiddleware.authorize(["Admin", "Production Manager"]),
  validate(UpdateScheduleSchema),
  productionCalendarController.updateSchedule
);
productionCalendarRoute.patch(
  "/:id/status",
  authMiddleware.authorize(["Admin", "Production Manager", "Painter"]),
  validate(UpdateScheduleStatusSchema),
  productionCalendarController.updateScheduleStatus
);
productionCalendarRoute.post(
  "/:id/rain-delay",
  authMiddleware.authorize(["Admin", "Production Manager"]),
  validate(RainDelaySchema),
  productionCalendarController.applyRainDelay
);

export default productionCalendarRoute;

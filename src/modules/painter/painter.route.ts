import { Router } from "express";
import { authMiddleware, painterController } from "../../container";
import { validate } from "../../middlewares/validate.middleware";
import { CreatePainterSchema, UpdatePainterSchema } from "./painter.schema";

const painterRoute = Router();

painterRoute.use(authMiddleware.authenticate);

painterRoute.get(
  "/me/crew",
  authMiddleware.authorize(["Painter"]),
  painterController.getMyCrew
);
painterRoute.get(
  "/me/schedule",
  authMiddleware.authorize(["Painter"]),
  painterController.getMySchedule
);

painterRoute.get(
  "/",
  authMiddleware.authorize(["Admin", "Production Manager"]),
  painterController.getPainters
);
painterRoute.post(
  "/",
  authMiddleware.authorize(["Admin", "Production Manager"]),
  validate(CreatePainterSchema),
  painterController.createPainter
);
painterRoute.get(
  "/:id",
  authMiddleware.authorize(["Admin", "Production Manager"]),
  painterController.getPainterById
);
painterRoute.patch(
  "/:id",
  authMiddleware.authorize(["Admin", "Production Manager"]),
  validate(UpdatePainterSchema),
  painterController.updatePainter
);

export default painterRoute;

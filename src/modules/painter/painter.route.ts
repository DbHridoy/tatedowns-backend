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
  authMiddleware.authorize(["Production Manager", "Admin"]),
  painterController.getPainters
);
painterRoute.post(
  "/",
  authMiddleware.authorize(["Production Manager", "Admin"]),
  validate(CreatePainterSchema),
  painterController.createPainter
);
painterRoute.get(
  "/:id",
  authMiddleware.authorize(["Production Manager", "Admin"]),
  painterController.getPainterById
);
painterRoute.patch(
  "/:id",
  authMiddleware.authorize(["Production Manager", "Admin"]),
  validate(UpdatePainterSchema),
  painterController.updatePainter
);

export default painterRoute;

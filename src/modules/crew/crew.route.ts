import { Router } from "express";
import { authMiddleware, crewController } from "../../container";
import { validate } from "../../middlewares/validate.middleware";
import {
  AssignPainterSchema,
  CreateCrewSchema,
  UpdateCrewSchema,
} from "./crew.schema";

const crewRoute = Router();

crewRoute.use(authMiddleware.authenticate);
crewRoute.use(authMiddleware.authorize(["Production Manager", "Admin"]));

crewRoute.post("/", validate(CreateCrewSchema), crewController.createCrew);
crewRoute.get("/", crewController.getCrews);
crewRoute.get("/:id", crewController.getCrewById);
crewRoute.patch("/:id", validate(UpdateCrewSchema), crewController.updateCrew);
crewRoute.delete("/:id", crewController.deleteCrew);
crewRoute.post("/:id/painters", validate(AssignPainterSchema), crewController.assignPainter);
crewRoute.delete("/:id/painters/:painterId", crewController.removePainter);
crewRoute.get("/:id/schedule", crewController.getCrewSchedule);
crewRoute.get("/:id/current-assignments", crewController.getCrewCurrentAssignments);

export default crewRoute;

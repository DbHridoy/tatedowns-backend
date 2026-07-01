import { Router } from "express";
import { validate } from "../../middlewares/validate.middleware";
import { CallLogSchema, ClientSchema } from "./client.schema";
import { authMiddleware, clientController } from "../../container";
import { uploadFile } from "../../middlewares/upload.middleware";
import { optionalAuth } from "../../middlewares/optional-auth.middleware";

const clientRoute = Router();

clientRoute.post("/", optionalAuth(authMiddleware.authenticate), clientController.createClient);

clientRoute.post(
  "/:clientId/client-note",
  optionalAuth(authMiddleware.authenticate),
  uploadFile({ fieldName: "file", uploadType: "single" }),
  clientController.createClientNote
);

clientRoute.use(authMiddleware.authenticate);

//---------------------post------------------------//

clientRoute.post("/:clientId/call-log", validate(CallLogSchema), clientController.createCallLog);

//---------------------get------------------------//

clientRoute.get("/", clientController.getAllClients);
clientRoute.get("/:clientId", clientController.getClientById);
clientRoute.get("/call-log", clientController.getAllCallLogs);
clientRoute.get("/:clientId/call-log", clientController.getCallLogsByClientId);
clientRoute.get("/:clientId/contracts", clientController.getContractsByClientId);

//---------------------patch------------------------//

clientRoute.patch("/:clientId", clientController.updateClient);

//---------------------delete------------------------//

clientRoute.delete("/:clientId", clientController.deleteClient);

export default clientRoute;

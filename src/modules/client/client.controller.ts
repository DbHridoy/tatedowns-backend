import { NextFunction, Request, Response } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { ClientService } from "./client.service";
import { HttpCodes } from "../../constants/status-codes";
import { logger } from "../../utils/logger";

export class ClientController {
  constructor(private clientService: ClientService) {}

  createClient = asyncHandler(async (req: Request, res: Response) => {
    const user = req.user;
    const body = req.body;

    const newClient = await this.clientService.createClient({
      body,
      user,
    });

    res.status(HttpCodes.Ok).json({
      success: true,
      message: "Client created successfully",
      data: newClient,
    });
  });

  createCallLog = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { body } = req;
      const clientId = req.params.clientId;
      const user = req.user;
      const newCallLog = await this.clientService.createCallLog(
        body,
        clientId,
        user
      );
      res.status(HttpCodes.Ok).json({
        success: true,
        message: "Call log created successfully",
        data: newCallLog,
      });
    }
  );

  createClientNote = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const body = req.body;
      const clientId = req.params.clientId;
      const user = req.user;

      logger.info({ body }, "ClientController.createClientNote");

      // Add file URL if uploaded
      if (req.file?.fileUrl) {
        body.file = req.file.fileUrl;
      }

      // logger.info({body},"ClientController.createClientNote");

      const newNote = await this.clientService.createClientNote(
        body,
        clientId,
        user
      );

      res.status(HttpCodes.Ok).json({
        success: true,
        message: "Client note created successfully",
        data: newNote,
      });
    }
  );

  getAllClients = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const query = req.query;
      // logger.info({ query }, "ClientController.getAllClients");
      const allClients = await this.clientService.getAllClients(query);
      res.status(HttpCodes.Ok).json({
        success: true,
        message: "All clients fetched successfully",
        data: allClients.data,
        total: allClients.total,
      });
    }
  );

  getClientById = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const clientId = req.params.clientId;
      const client = await this.clientService.getClientById(clientId);
      res.status(HttpCodes.Ok).json({
        success: true,
        message: "Client fetched successfully",
        data: client,
      });
    }
  );

  getAllCallLogs = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const allCallLogs = await this.clientService.getAllCallLogs(req.query);
      res.status(HttpCodes.Ok).json({
        success: true,
        message: "All call logs fetched successfully",
        data: allCallLogs.data,
        total: allCallLogs.total,
      });
    }
  );

  getCallLogsByClientId = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const clientId = req.params.clientId;
      const callLogs = await this.clientService.getCallLogByClientId(
        clientId,
        req.query
      );
      res.status(HttpCodes.Ok).json({
        success: true,
        message: "All call logs for this client fetched successfully",
        data: callLogs.data,
        total: callLogs.total,
      });
    }
  );

  getContractsByClientId = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const clientId = req.params.clientId;
      const contracts = await this.clientService.getContractsByClientId(
        clientId,
        req.query
      );
      res.status(HttpCodes.Ok).json({
        success: true,
        message: "All contracts for this client fetched successfully",
        data: contracts.data,
        total: contracts.total,
      });
    }
  );

  getAllClientNotes = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const allClientNotes = await this.clientService.getAllClientNote(
        req.query
      );
      res.status(HttpCodes.Ok).json({
        success: true,
        message: "All client notes fetched successfully",
        data: allClientNotes.data,
        total: allClientNotes.total,
      });
    }
  );

  getClientNotesByClientId = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const clientId = req.params.clientId;
      const clientNotes = this.clientService.getClientNoteByClientId;
    }
  );

  updateClient = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const clientId = req.params.clientId;
      const updatedClientInfo = req.body;
      const updatedClient = await this.clientService.updateClient(
        clientId,
        updatedClientInfo
      );
      res.status(HttpCodes.Ok).json({
        success: true,
        message: "Client updated successfully",
        data: updatedClient,
      });
    }
  );

  deleteClient = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const clientId = req.params.clientId;
      const deletedClient = await this.clientService.deleteClient(clientId);
      res.status(HttpCodes.Ok).json({
        success: true,
        message: "Client deleted successfully",
        data: deletedClient,
      });
    }
  );
}

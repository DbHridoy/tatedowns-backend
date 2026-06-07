import { Types } from "mongoose";
import { ClientRepository } from "./client.repository";
import { apiError } from "../../errors/api-error";
import { Errors } from "../../constants/error-codes";
import {
  createNotification,
} from "../../utils/create-notification-utils";
import { SalesRepRepository } from "../sales-rep/sales-rep.repository";
import { CommonService } from "../common/common.service";
import { Job } from "../job/job.model";

export class ClientService {
  constructor(
    private clientRepo: ClientRepository,
    private salesRepRepo: SalesRepRepository,
    private commonService: CommonService
  ) { }

  createClient = async ({
    body,
    user,
  }: {
    body: any;
    user?: any;
  }) => {
    let salesRepId: Types.ObjectId | null = null;

    // Only Sales Rep can be assigned
    if (user?.role === "Sales Rep") {
      const salesRep = await this.salesRepRepo.findByUserId(user.userId);

      if (!salesRep) {
        throw new Error("Sales rep profile not found");
      }

      salesRepId = user.userId;
    }

    const clientPayload = {
      ...body,
      salesRepId,
      createdBy: user?.userId ?? null,
    };

    const newClient = await this.clientRepo.createClient(clientPayload);

    const trimmedNote =
      typeof body.note === "string" ? body.note.trim() : "";

    if (trimmedNote && user?.userId) {
      await this.clientRepo.createClientNote({
        clientId: newClient._id,
        note: trimmedNote,
        createdBy: user.userId,
      });
    }

    if (newClient.salesRepId) {
      await this.salesRepRepo.incrementSalesRepStats(
        "client",
        newClient.salesRepId
      );
    }

    if (newClient.salesRepId) {
      await createNotification({
        forUser: newClient.salesRepId.toString(),
        type: "client_assigned",
        message: `You have been assigned a new client: ${newClient.clientName ||
          newClient.customClientId ||
          newClient._id
          }`,
      });
    }

    return newClient;
  };


  createCallLog = async (callLogData: any, clientId: string, user: any) => {
    const callLogPayload: any = {
      ...callLogData,
      clientId,
      createdBy: user.userId,
    };
    const newCallLog = await this.clientRepo.createCallLog(callLogPayload);
    return newCallLog;
  };

  createClientNote = async (clientNoteData: any, clientId: string, user: any) => {
    const trimmedNote =
      typeof clientNoteData.note === "string"
        ? clientNoteData.note.trim()
        : "";
    const file = clientNoteData.file;
    if (!trimmedNote && !file) {
      throw new Error("Note or file is required");
    }
    const clientNotePayload: any = {
      ...clientNoteData,
      note: trimmedNote,
      quoteId: clientNoteData.quoteId || null,
      jobId: clientNoteData.jobId || null,
      clientId,
      createdBy: user?.userId,
    };
    const newClientNote = await this.clientRepo.createClientNote(
      clientNotePayload
    );

    if (clientNotePayload.jobId) {
      const job = await Job.findById(clientNotePayload.jobId).select(
        "productionManagerId"
      );
      if (job?.productionManagerId) {
        await createNotification({
          forUser: job.productionManagerId.toString(),
          type: "note_added",
          message: "A note was added to one of your jobs",
        });
      }
    }

    return newClientNote;
  };

  getAllClients = async (query: any) => {
    return await this.clientRepo.getAllClients(query);
  };

  getClientById = async (clientId: string) => {
    return await this.clientRepo.getClientById(clientId);
  };

  getAllCallLogs = async (query: any) => {
    return await this.clientRepo.getAllCallLogs(query);
  };

  getCallLogByClientId = async (id: string, query: any) => {
    return await this.clientRepo.getCallLogByClientId(id, query);
  };

  getAllClientNote = async (query: any) => {
    return await this.clientRepo.getAllClientNote(query);
  };

  getClientNoteByClientId = async (clientId: string) => {
    return await this.clientRepo.getClientNoteByClientId(clientId);
  };

  getContractsByClientId = async (clientId: string, query: any) => {
    return await this.clientRepo.getContractsByClientId(clientId, query);
  };

  updateClient = async (clientId: string, clientInfo: any) => {
    const existingClient = await this.clientRepo.getClientById(clientId);
    const updatedClient = await this.clientRepo.updateClient(
      clientId,
      clientInfo
    );
    const newSalesRepId = updatedClient?.salesRepId?.toString();
    const previousSalesRepId = existingClient?.salesRepId?.toString();
    if (newSalesRepId && newSalesRepId !== previousSalesRepId) {
      if (previousSalesRepId) {
        await createNotification({
          forUser: previousSalesRepId,
          type: "client_unassigned",
          message: `You have been unassigned from client: ${updatedClient?.clientName || updatedClient?._id}`,
        });
      }
      await createNotification({
        forUser: newSalesRepId,
        type: "client_assigned",
        message: `You have been assigned a new client: ${updatedClient?.clientName || updatedClient?._id}`,
      });
    }
    return updatedClient;
  };

  deleteClient = async (clientId: string) => {
    return await this.clientRepo.deleteClient(clientId);
  };
}

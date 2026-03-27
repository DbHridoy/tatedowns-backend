import { SalesRepRepository } from "../sales-rep/sales-rep.repository";
import { QuoteRepository } from "./quote.repository";
import { ClientRepository } from "../client/client.repository";
import { JobRepository } from "../job/job.repository";
import {
  createNotification,
} from "../../utils/create-notification-utils";
import { apiError } from "../../errors/api-error";
import { Errors } from "../../constants/error-codes";

export class QuoteService {
  constructor(
    private readonly quoteRepository: QuoteRepository,
    private readonly salesRepRepo: SalesRepRepository,
    private readonly clientRepo: ClientRepository,
    private readonly jobRepository: JobRepository
  ) { }

  private normalizeObjectId = (value: any) => {
    if (!value) {
      return null;
    }

    if (typeof value === "string") {
      return value;
    }

    if (value._id) {
      return value._id.toString();
    }

    return value.toString();
  };

  createQuote = async (
    quoteInfo: any,
    user: any,
    bidSheet?: string
  ) => {



    const salesRep = await this.salesRepRepo.findByUserId(user.userId);

    if (!salesRep) {
      throw new Error("Sales rep profile not found");
    }



    const quote = {
      ...quoteInfo,
      ...(bidSheet ? { bidSheetUrl: bidSheet } : {}),
      salesRepId: user.userId
    };

    const newQuote = await this.quoteRepository.createQuote(quote);
    const quoteNote = {
      clientId: quoteInfo.clientId,
      quoteId: newQuote._id,
      note: quoteInfo.notes || "",
      createdBy: user.userId,
    }
    await this.clientRepo.createClientNote(quoteNote);
    if (user.userId) {
      await this.salesRepRepo.incrementSalesRepStats('quote', user.userId);
    }
    await this.clientRepo.updateLeadStatus(
      newQuote.clientId.toString(),
      "Quoted"
    );
    return newQuote;
  };

  getAllQuote = async (query: any) => {
    const quoteData = await this.quoteRepository.getAllQuotes(query);
    return quoteData;
  };

  getQuoteById = async (id: string) => {
    return await this.quoteRepository.getQuoteById(id);
  };

  updateQuoteById = async (
    id: string,
    quoteInfo: any,
    bidSheetUrl?: string,
    user?: any
  ) => {
    const existingQuote = await this.quoteRepository.getQuoteById(id);
    if (!existingQuote) {
      throw new apiError(Errors.NotFound.code, Errors.NotFound.message);
    }
    if (!user) {
      throw new apiError(Errors.Unauthorized.code, Errors.Unauthorized.message);
    }
    const isAdmin = user.role === "Admin";
    const isAssignedSalesRep =
      user.role === "Sales Rep" &&
      existingQuote.salesRepId?.toString() === user.userId?.toString();
    if (!isAdmin && !isAssignedSalesRep) {
      throw new apiError(Errors.Forbidden.code, Errors.Forbidden.message);
    }

    const { bidSheet, ...updateInfo } = quoteInfo || {};
    const finalUpdateInfo = {
      ...updateInfo,
      ...(bidSheetUrl ? { bidSheetUrl } : {}),
    };
    const updatedQuote = await this.quoteRepository.updateQuoteById(
      id,
      finalUpdateInfo
    );
    const previousStatus = existingQuote.status?.toString();
    const nextStatus = updatedQuote?.status?.toString();
    if (previousStatus !== nextStatus) {
      if (existingQuote.salesRepId) {
        await createNotification({
          forUser: existingQuote.salesRepId.toString(),
          type: "quote_status_updated",
          message: `Quote status changed from ${previousStatus || "N/A"} to ${nextStatus || "N/A"}`,
        });
      }
    }
    if (!bidSheetUrl) {
      return updatedQuote;
    }

    return this.quoteRepository.getQuoteById(id);
  };

  deleteQuoteById = async (id: string) => {
    const existingQuote = await this.quoteRepository.getQuoteById(id);
    const deletedQuote = await this.quoteRepository.deleteQuoteById(id);

    const clientId = this.normalizeObjectId(existingQuote?.clientId);
    if (!clientId) {
      return deletedQuote;
    }
    const [remainingJobs, remainingQuotes] = await Promise.all([
      this.jobRepository.countJobsByClientId(clientId),
      this.quoteRepository.countQuotesByClientId(clientId),
    ]);

    const nextLeadStatus =
      remainingJobs > 0
        ? "Job"
        : remainingQuotes > 0
          ? "Quoted"
          : "Not quoted";

    await this.clientRepo.updateLeadStatus(clientId, nextLeadStatus);

    return deletedQuote;
  };
}

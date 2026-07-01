import { Types } from "mongoose";
import { DesignConsultation } from "./design-consultation.model";
import { JobRepository } from "./job.repository";
import { SalesRepRepository } from "../sales-rep/sales-rep.repository";
import { QuoteRepository } from "../quote/quote.repository";
import { logger } from "../../utils/logger";
import { ClientRepository } from "../client/client.repository";
import {
  createAdminNotificationForJobStatus,
  createNotification,
  createNotificationsForRole,
} from "../../utils/create-notification-utils";

export class JobService {
  constructor(
    private readonly jobRepository: JobRepository,
    private salesRepRepo: SalesRepRepository,
    private quoteRepo: QuoteRepository,
    private clientRepo: ClientRepository
  ) { }

  private normalizeObjectId = (value: any) => {
    if (!value) {
      return null;
    }
    if (typeof value === "string") {
      return value;
    }
    if (value instanceof Types.ObjectId) {
      return value.toString();
    }
    if (value._id) {
      return value._id.toString();
    }
    return value.toString();
  };

  private applyDesignConsultationAdjustments = (job: any) => {
    if (!job) {
      return job;
    }
    const base = job.toObject ? job.toObject() : { ...job };
    const dc = Array.isArray(base.designConsultation)
      ? base.designConsultation[0]
      : base.designConsultation;
    const addedHours = Number(dc?.addedHours || 0);
    const estimatedGallons = Number(dc?.estimatedGallons || 0);
    const upsellValue = Number(dc?.upsellValue || 0);
    const totalHours = Number(base.totalHours || 0) + addedHours;
    const totalEstimatedGallons =
      Number(base.estimatedGallons || 0) + estimatedGallons;
    const totalPrice = Number(base.price || 0) + upsellValue;
    const laborHours =
      totalHours -
      Number(base.powerwash || 0) -
      Number(base.setupCleanup || 0);

    return {
      ...base,
      totalHours,
      estimatedGallons: totalEstimatedGallons,
      price: totalPrice,
      laborHours,
    };
  };

  private notifyJobStatusChange = async (
    previousStatus: string | undefined,
    nextStatus: string | undefined,
    job: any
  ) => {
    if (!nextStatus || previousStatus === nextStatus) {
      return;
    }
    const salesRepUserId = this.normalizeObjectId(job?.salesRepId);
    const productionManagerId = this.normalizeObjectId(job?.productionManagerId);
    const type =
      previousStatus === "Downpayment Pending" || nextStatus === "Downpayment Pending"
        ? "downpayment_status_updated"
        : "job_status_updated";
    const message = `Job status changed from ${previousStatus || "N/A"} to ${nextStatus}`;

    if (salesRepUserId) {
      await createNotification({
        forUser: salesRepUserId,
        type,
        message,
      });
    }

    if (productionManagerId) {
      await createNotification({
        forUser: productionManagerId,
        type: "job_status_updated",
        message,
      });
    }

  };

  createJob = async (jobInfo: any, contractUrl: string | undefined, user: any) => {
    const salesRep = await this.salesRepRepo.findByUserId(user.userId);
    if (!salesRep) {
      throw new Error("Sales rep not found");
    }
    if (jobInfo.quoteId) {
      const quote = await this.quoteRepo.updateQuoteStatus(
        jobInfo.quoteId,
        "Approved"
      );

      if (quote?.clientId) {
        await this.clientRepo.updateLeadStatus(
          quote.clientId.toString(),
          "Job"
        );
      }

    }
    const job = {
      ...jobInfo,
      ...(contractUrl ? { contractUrl } : {}),
      salesRepId: user.userId,
      status: "Downpayment Pending",
    };
    const newJob = await this.jobRepository.createJob(job);
    await this.salesRepRepo.incrementSalesRepStats("job", user.userId);
    await createAdminNotificationForJobStatus("Downpayment Pending");
    return newJob;
  };

  createJobNote = async (jobNote: any, user: any) => {
    const jobNoteData = {
      clientId: jobNote.clientId,
      quoteId: jobNote.quoteId,
      jobId: jobNote.jobId,
      note: jobNote.note,
      file: jobNote.file,
      createdBy: user.userId,
    };
    const newNote = await this.jobRepository.createJobNote(jobNoteData);
    if (jobNoteData.jobId) {
      const job = await this.jobRepository.getJobById(jobNoteData.jobId);
      const productionManagerId = this.normalizeObjectId(
        job?.productionManagerId
      );
      if (productionManagerId) {
        await createNotification({
          forUser: productionManagerId,
          type: "note_added",
          message: "A note was added to one of your jobs",
        });
      }
    }
    return newNote;
  };

  createNewDesignConsultation = async (designConsultationInfo: any) => {
    const newDesignConsultation = new DesignConsultation(
      designConsultationInfo
    );
    return await newDesignConsultation.save();
  };

  getAllJobs = async (query: any) => {
    const result = await this.jobRepository.getAllJobs(query);
    return {
      ...result,
      jobs: result.jobs.map(this.applyDesignConsultationAdjustments),
    };
  };

  getJobById = async (id: string) => {
    const job = await this.jobRepository.getJobById(id);
    return this.applyDesignConsultationAdjustments(job);
  };

  getAllDesignConsultation = async (query: any) => {
    return await this.jobRepository.getAllDesignConsultation(query);
  };

  getDesignConsultationById = async (id: string) => {
    return await DesignConsultation.findById(id);
  };

  getAllDownpaymentRequest = async (query: any) => {
    return await this.jobRepository.getAllDownpaymentRequest(query);
  };

  getAllJobCloseApproval = async (query: any) => {
    return await this.jobRepository.getAllJobCloseApproval(query);
  };

  getAllJobBySalesRepId = async (id: string, query: any) => {
    return await this.jobRepository.getAllJobBySalesRepId(id, query);
  };

  getAllPaymentBySalesRepId = async (id: string, query: any) => {
    return await this.jobRepository.getAllPaymentBySalesRepId(id, query);
  };

  updateJobById = async (id: string, jobInfo: any, user: any) => {
    const job = await this.jobRepository.getJobById(id);
    if (!job) {
      throw new Error("Job not found");
    }
    const previousStatus = job.status?.toString();
    const requestedStatus = jobInfo?.status?.toString();
    const previousProductionManagerId = this.normalizeObjectId(
      job.productionManagerId
    );
    const nextProductionManagerId = this.normalizeObjectId(
      jobInfo?.productionManagerId
    );
    let notifiedProductionManagerChange = false;
    if (nextProductionManagerId && nextProductionManagerId !== previousProductionManagerId) {
      if (previousProductionManagerId) {
        await createNotification({
          forUser: previousProductionManagerId,
          type: "job_unassigned",
          message: "You have been unassigned from a job",
        });
      }
      await createNotification({
        forUser: nextProductionManagerId,
        type: "job_assigned",
        message: "A new job has been assigned to you",
      });
      notifiedProductionManagerChange = true;
    }
    const status = jobInfo?.status;
    if (status === "Scheduled and Open") {
      if (!jobInfo?.productionManagerId) {
        throw new Error("Production manager is required");
      }
      const updatedJob = await this.jobRepository.updateJobById(id, jobInfo);
      if (!notifiedProductionManagerChange) {
        const productionManagerId = this.normalizeObjectId(
          jobInfo.productionManagerId
        );
        await createNotification({
          forUser: productionManagerId,
          type: "job_assigned",
          message: "A new job has been assigned to you",
        });
      }
      await this.notifyJobStatusChange(
        previousStatus,
        updatedJob?.status?.toString(),
        updatedJob || job
      );
      return updatedJob;
    }
    if (status === "Ready to Schedule") {
      const updatedJob = await this.jobRepository.updateJobById(id, jobInfo);
      await createNotificationsForRole("Production Manager", {
        type: "job_status_ready_to_schedule",
        message: "A job is ready to schedule",
      });
      await this.notifyJobStatusChange(
        previousStatus,
        updatedJob?.status?.toString(),
        updatedJob || job
      );
      return updatedJob;
    }
    if (status === "Pending Close") {
      const updatedJob = await this.jobRepository.updateJobById(id, jobInfo);
      await createAdminNotificationForJobStatus("Pending Close");
      await this.notifyJobStatusChange(
        previousStatus,
        updatedJob?.status?.toString(),
        updatedJob || job
      );
      return updatedJob;
    }
    if (status === "Closed" && job) {
      const updatedJob = await this.jobRepository.updateJobById(id, jobInfo);
      const salesRepUserId = this.normalizeObjectId(job.salesRepId);
      if (salesRepUserId) {
        await this.salesRepRepo.updateCommissionEarned(
          salesRepUserId as any,
          job.price
        );
      }
      const productionManagerId = this.normalizeObjectId(
        job.productionManagerId
      );
      if (productionManagerId) {
        await createNotification({
          forUser: productionManagerId,
          type: "job_status_closed",
          message: "A job assigned to you was marked as Closed",
        });
      }
      await this.notifyJobStatusChange(
        previousStatus,
        updatedJob?.status?.toString(),
        updatedJob || job
      );
      return updatedJob;
    }

    const updatedJob = await this.jobRepository.updateJobById(id, jobInfo);
    const nextStatus = requestedStatus || updatedJob?.status?.toString();
    if (
      nextStatus === "Downpayment Pending" ||
      nextStatus === "DC Pending" ||
      nextStatus === "DC Awaiting Approval"
    ) {
      await createAdminNotificationForJobStatus(nextStatus);
    }
    await this.notifyJobStatusChange(
      previousStatus,
      nextStatus,
      updatedJob || job
    );
    return updatedJob;
  };
  
  assignSalesRep = async (jobId: string, salesRepId: string) => {
    const existingJob = await this.jobRepository.getJobById(jobId);
    const updatedJob = await this.jobRepository.assignSalesRep(jobId, salesRepId);
    const previousSalesRepId = this.normalizeObjectId(existingJob?.salesRepId);
    const nextSalesRepId = this.normalizeObjectId(updatedJob?.salesRepId);

    if (previousSalesRepId && previousSalesRepId !== nextSalesRepId) {
      await createNotification({
        forUser: previousSalesRepId,
        type: "job_unassigned",
        message: "You have been unassigned from a job",
      });
    }
    if (nextSalesRepId && previousSalesRepId !== nextSalesRepId) {
      await createNotification({
        forUser: nextSalesRepId,
        type: "job_assigned_sales_rep",
        message: "A job has been assigned to you",
      });
    }
    return updatedJob;
  }

  deleteJobById = async (id: string) => {
    return await this.jobRepository.deleteJobById(id);
  };
}

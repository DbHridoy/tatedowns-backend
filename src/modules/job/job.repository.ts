
import { Job } from "./job.model";
import { buildDynamicSearch } from "../../utils/dynamic-search-utils";
import { logger } from "../../utils/logger";
import { DesignConsultation } from "./design-consultation.model";
import { Types } from "mongoose";
import Payment from "./payment.model";
import ClientNote from "../client/client-note.model";

export class JobRepository {
  private castObjectIdFilters = (match: Record<string, any>) => {
    const objectIdFields = [
      "salesRepId",
      "clientId",
      "quoteId",
      "productionManagerId",
      "_id",
    ];
    const casted = { ...match };

    for (const field of objectIdFields) {
      const value = casted[field];
      if (typeof value === "string" && Types.ObjectId.isValid(value)) {
        casted[field] = new Types.ObjectId(value);
      } else if (value && typeof value === "object" && Array.isArray(value.$in)) {
        casted[field] = {
          ...value,
          $in: value.$in.map((item: any) =>
            typeof item === "string" && Types.ObjectId.isValid(item)
              ? new Types.ObjectId(item)
              : item
          ),
        };
      }
    }

    return casted;
  };

  createJob = async (jobInfo: any) => {
    logger.info({ jobInfo }, "JobRepository.createNewJob");
    const newJob = new Job(jobInfo);
    return await newJob.save();
  };

  countJobsByClientId = async (clientId: string) => {
    return Job.countDocuments({ clientId });
  };

  createJobNote = async (jobNote: any) => {
    logger.info({ jobNote }, "JobRepository.createJobNote line 36");
    const newJobNote = new ClientNote(jobNote);
    return newJobNote.save();
  };

  getAllJobs = async (query: any) => {
    const normalizedQuery =
      query?.pmId && !query?.productionManagerId
        ? { ...query, productionManagerId: query.pmId }
        : query;
    const { filter, search, options } = buildDynamicSearch(Job, normalizedQuery);
    const { sort, ...queryOptions } = options;
    const hasStartDateSort =
      sort && Object.prototype.hasOwnProperty.call(sort, "startDate");

    if (hasStartDateSort) {
      const startDateDirection = sort.startDate;
      const match = this.castObjectIdFilters({ ...filter, ...search });

      const [jobs, total] = await Promise.all([
        Job.aggregate([
          { $match: match },
          {
            $addFields: {
              __sortDate: { $ifNull: ["$startDate", "$estimatedStartDate"] },
              __missingSortDate: {
                $cond: [{ $eq: [{ $ifNull: ["$startDate", "$estimatedStartDate"] }, null] }, 1, 0],
              },
            },
          },
          {
            $sort: {
              __missingSortDate: 1,
              __sortDate: startDateDirection,
              createdAt: -1,
            },
          },
          { $skip: queryOptions.skip || 0 },
          ...(queryOptions.limit ? [{ $limit: queryOptions.limit }] : []),
        ]),
        Job.countDocuments(match),
      ]);

      const populatedJobs = await Job.populate(jobs, [
        { path: "clientId" },
        { path: "salesRepId" },
        { path: "quoteId" },
        {
          path: "notes",
          populate: { path: "createdBy" },
        },
        { path: "designConsultation" },
        { path: "productionManagerId" },
      ]);

      return { jobs: populatedJobs, total };
    }

    const [jobs, total] = await Promise.all([
      Job.find({ ...filter, ...search }, null, queryOptions)
        .sort(sort)
        .populate("clientId salesRepId quoteId")
        .populate({
          path: "notes",
          populate: {
            path: "createdBy",
          },
        })
        .populate([{
          path: "designConsultation"
        }, {
          path: "productionManagerId"
        }]),
      Job.countDocuments({ ...filter, ...search }),
    ]);
    return { jobs, total };
  };

  getJobById = async (id: string) => {
    return await Job.findById(id)
      .populate("clientId salesRepId productionManagerId")
      .populate("quoteId")
      .populate([
        {
          path: "notes",
          populate: {
            path: "createdBy",
          },
        },
        {
          path: "designConsultation",
        },
      ]);

  };

  createNewDesignConsultation = async (designConsultationInfo: any) => {
    const newDesignConsultation = new DesignConsultation(
      designConsultationInfo
    );
    return await newDesignConsultation.save();
  };

  getAllDesignConsultation = async (query: any) => {
    const { filter, search, options } = buildDynamicSearch(
      DesignConsultation,
      query
    );
    const [designConsultations, total] = await Promise.all([
      DesignConsultation.find({ ...filter, ...search }, null, options),
      DesignConsultation.countDocuments({ ...filter, ...search }),
    ]);
    return { data: designConsultations, total };
  };

  getDesignConsultationById = async (id: string) => {
    return await DesignConsultation.findById(id);
  };

  getAllDownpaymentRequest = async (query: any) => {
    const { filter, search, options } = buildDynamicSearch(Job, query);

    // merge filters correctly
    const finalFilter = {
      ...filter,
      ...search,
      status: "Downpayment Pending",
    };

    const [downpaymentRequest, total] = await Promise.all([
      Job.find(finalFilter, null, options).populate({
        path: "quoteId",
        populate: {
          path: "clientId",
        },
      }),
      Job.countDocuments(finalFilter),
    ]);

    return { downpaymentRequest, total };
  };

  getAllJobCloseApproval = async (query: any) => {
    const { filter, search, options } = buildDynamicSearch(Job, query);

    // merge filters correctly
    const finalFilter = {
      ...filter,
      ...search,
      status: "Pending Close",
    };

    const [jobs, total] = await Promise.all([
      Job.find(finalFilter, null, options).populate({
        path: "quoteId",
        populate: {
          path: "clientId",
        },
      }),
      Job.countDocuments(finalFilter),
    ]);

    return { jobs, total };
  };

  getAllJobBySalesRepId = async (salesRepId: string, query: any) => {
    const { filter, search, options } = buildDynamicSearch(Job, query);

    const matchStage = {
      ...filter,
      ...search,
      "client.salesRepId": new Types.ObjectId(salesRepId),
    };

    const pipeline = [
      // 🔹 Join Quote
      {
        $lookup: {
          from: "quotes", // ⚠️ collection name (plural!)
          localField: "quoteId",
          foreignField: "_id",
          as: "quote",
        },
      },
      { $unwind: "$quote" },

      // 🔹 Join Client
      {
        $lookup: {
          from: "clients", // ⚠️ collection name (plural!)
          localField: "quote.clientId",
          foreignField: "_id",
          as: "client",
        },
      },
      { $unwind: "$client" },

      // 🔹 Apply ALL filters here
      {
        $match: matchStage,
      },

      // 🔹 Branch pipeline
      {
        $facet: {
          jobs: [
            { $sort: options.sort },
            { $skip: options.skip },
            { $limit: options?.limit || 10 },
          ],

          totalCount: [{ $count: "total" }],

          totalEstimatedPrice: [
            {
              $group: {
                _id: null,
                sum: { $sum: "$estimatedPrice" },
              },
            },
          ],
        },
      },
    ];

    const [result] = await Job.aggregate(pipeline);

    return {
      jobs: result.jobs,
      total: result.totalCount[0]?.total || 0,
      totalEstimatedPrice: result.totalEstimatedPrice[0]?.sum || 0,
    };
  };

  getAllPaymentBySalesRepId = async (id: string, query: any) => {
    const { filter, search, options } = buildDynamicSearch(Payment, query);
    const matchStage = {
      ...filter,
      ...search,
      salesRepId: new Types.ObjectId(id),
    };
    const payment = await Payment.find(matchStage, null, options);
    const total = await Payment.countDocuments(matchStage);
    return { payment, total };
  };

  updateJobById = async (id: string, jobInfo: any) => {
    const updatedJob = await Job.findByIdAndUpdate(id, jobInfo, { new: true });
    return updatedJob;
  };

  assignSalesRep = async (jobId: string, salesRepId: string) => {
    return await Job.findByIdAndUpdate(
      jobId,
      { salesRepId: salesRepId },
      { new: true }
    );
  };

  deleteJobById = async (id: string) => {
    const deletedJob = await Job.findByIdAndDelete(id);
    return deletedJob;
  };
}

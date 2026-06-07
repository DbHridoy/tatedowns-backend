// salesRep.repository.ts
import { Types } from "mongoose";
import { SalesRep } from "./sales-rep.model";
import { logger } from "../../utils/logger";
import { Variable } from "../common/variable.model";

const getCalendarPeriodRange = (date: Date, periodType: string) => {
  const base = new Date(date);
  if (Number.isNaN(base.getTime())) {
    throw new Error("Invalid date");
  }

  let start: Date;
  let end: Date;

  switch (periodType) {
    case "day": {
      start = new Date(base.getFullYear(), base.getMonth(), base.getDate());
      end = new Date(start);
      end.setDate(end.getDate() + 1);
      break;
    }
    case "week": {
      const dayOfWeek = base.getDay();
      start = new Date(base.getFullYear(), base.getMonth(), base.getDate() - dayOfWeek);
      end = new Date(start);
      end.setDate(end.getDate() + 7);
      break;
    }
    case "month": {
      start = new Date(base.getFullYear(), base.getMonth(), 1);
      end = new Date(base.getFullYear(), base.getMonth() + 1, 1);
      break;
    }
    case "year": {
      start = new Date(base.getFullYear(), 0, 1);
      end = new Date(base.getFullYear() + 1, 0, 1);
      break;
    }
    default:
      throw new Error("Invalid period type");
  }

  return { start, end };
};

export class SalesRepRepository {
  findByUserId = async (userId: Types.ObjectId) => {
    logger.info({ userId }, "SalesRepRepository.findByUserId");
    return SalesRep.findOne({ userId });
  };

  getLeaderboard = async (periodType?: string, date?: Date) => {
    const variable = await Variable.findOne().select("salesRepCommissionRate");
    const commissionRate = Number(variable?.salesRepCommissionRate || 0);
    const normalizedCommissionRate = commissionRate / 100;
    const range = periodType && date ? getCalendarPeriodRange(date, periodType) : null;
    const dateFilter = range
      ? { createdAt: { $gte: range.start, $lt: range.end } }
      : {};

    return SalesRep.aggregate([
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $lookup: {
          from: "clients",
          let: { userId: "$userId" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$salesRepId", "$$userId"] },
                ...dateFilter,
              },
            },
            { $count: "count" },
          ],
          as: "clientAgg",
        },
      },
      {
        $lookup: {
          from: "quotes",
          let: { userId: "$userId" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$salesRepId", "$$userId"] },
                ...dateFilter,
              },
            },
            { $count: "count" },
          ],
          as: "quoteAgg",
        },
      },
      {
        $lookup: {
          from: "jobs",
          let: { userId: "$userId" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$salesRepId", "$$userId"] },
                ...dateFilter,
              },
            },
            {
              $group: {
                _id: null,
                totalJobs: { $sum: 1 },
                totalRevenueSold: {
                  $sum: {
                    $cond: [
                      { $ne: ["$status", "Cancelled"] },
                      "$price",
                      0,
                    ],
                  },
                },
                totalRevenueProduced: {
                  $sum: {
                    $cond: [{ $eq: ["$status", "Closed"] }, "$price", 0],
                  },
                },
                totalCommissionEarnedBase: {
                  $sum: {
                    $cond: [{ $eq: ["$status", "Closed"] }, "$price", 0],
                  },
                },
                totalCommissionPaidBase: {
                  $sum: {
                    $cond: [{ $eq: ["$status", "Closed"] }, "$price", 0],
                  },
                },
                totalCommissionPendingBase: {
                  $sum: {
                    $cond: [
                      {
                        $ne: ["$status", "Closed"],
                      },
                      "$price",
                      0,
                    ],
                  },
                },
              },
            },
          ],
          as: "jobAgg",
        },
      },
      {
        $addFields: {
          totalClients: {
            $ifNull: [{ $arrayElemAt: ["$clientAgg.count", 0] }, 0],
          },
          totalQuotes: {
            $ifNull: [{ $arrayElemAt: ["$quoteAgg.count", 0] }, 0],
          },
          totalJobs: {
            $ifNull: [{ $arrayElemAt: ["$jobAgg.totalJobs", 0] }, 0],
          },
          totalRevenueSold: {
            $ifNull: [{ $arrayElemAt: ["$jobAgg.totalRevenueSold", 0] }, 0],
          },
          totalRevenueProduced: {
            $ifNull: [
              { $arrayElemAt: ["$jobAgg.totalRevenueProduced", 0] },
              0,
            ],
          },
          totalCommissionEarned: {
            $multiply: [
              {
                $ifNull: [
                  { $arrayElemAt: ["$jobAgg.totalCommissionEarnedBase", 0] },
                  0,
                ],
              },
              normalizedCommissionRate,
            ],
          },
          totalCommissionPaid: {
            $multiply: [
              {
                $ifNull: [
                  { $arrayElemAt: ["$jobAgg.totalCommissionPaidBase", 0] },
                  0,
                ],
              },
              normalizedCommissionRate,
            ],
          },
          totalCommissionPending: {
            $multiply: [
              {
                $ifNull: [
                  { $arrayElemAt: ["$jobAgg.totalCommissionPendingBase", 0] },
                  0,
                ],
              },
              normalizedCommissionRate,
            ],
          },
        },
      },
      {
        $project: {
          _id: 1,
          userId: 1,
          cluster: 1,
          user: {
            _id: 1,
            fullName: 1,
            email: 1,
            role: 1,
            cluster: 1,
            address: 1,
            phoneNumber: 1,
            profileImage: 1,
          },
          totalRevenueProduced: 1,
          totalRevenueSold: 1,
          totalJobs: 1,
          totalQuotes: 1,
          totalClients: 1,
        },
      },
      {
        $sort: {
          totalRevenueProduced: -1,
          totalRevenueSold: -1,
          totalJobs: -1,
          totalQuotes: -1,
          totalClients: -1,
        },
      },
      { $limit: 5 },
    ]);
  };

  getSalesRepProfile = async (salesRepId: Types.ObjectId) => {
    return SalesRep.findById(salesRepId).populate("userId");
  };


  incrementSalesRepStats = async (eventType: string, userId: Types.ObjectId) => {
    const updateFields: any = {};
    const salesRep = await this.findByUserId(userId);
    if (!salesRep) {
      throw new Error("Sales rep profile not found");
    }

    switch (eventType) {
      case 'client':
        updateFields.totalClients = 1;
        break;
      case 'quote':
        updateFields.totalQuotes = 1;
        break;
      case 'job':
        updateFields.totalJobs = 1;
        break;
      default:
        throw new Error(`Invalid event type: ${eventType}`);
    }

    return SalesRep.findByIdAndUpdate(salesRep._id, {
      $inc: updateFields,
    });
  };

  updateCommissionEarned = async (
    salesRepId: Types.ObjectId | string,
    amount: number
  ) => {
    const variable = await Variable.findOne().select("salesRepCommissionRate");
    const commissionRate = Number(variable?.salesRepCommissionRate || 0);
    const commissionAmount = (amount || 0) * (commissionRate / 100);
    return SalesRep.findOneAndUpdate(
      { userId: salesRepId },
      {
        $inc: {
          commissionEarned: commissionAmount,
          commissionRemaining: commissionAmount,
        },
      }
    );
  };

  updateCommissionPaid = async (
    salesRepId: Types.ObjectId | string,
    amount: number
  ) => {
    return SalesRep.findOneAndUpdate(
      { userId: salesRepId },
      {
        $inc: {
          commissionPaid: amount || 0,
          commissionRemaining: -(amount || 0),
        },
      }
    );
  };
}

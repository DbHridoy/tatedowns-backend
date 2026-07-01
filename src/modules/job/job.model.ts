import { Schema, model, Types, Document } from "mongoose";
import { commonService } from "../../container";

// TypeScript interface for Job
export interface JobDocument extends Document {
  customJobId: string;
  salesRepId: Types.ObjectId;
  clientId: Types.ObjectId;
  quoteId: Types.ObjectId;
  productionManagerId: Types.ObjectId;
  contractUrl: string;
  title: string;
  price: number;
  downPayment: number;
  budgetSpent: number;
  totalHours: number;
  setupCleanup: number;
  powerwash: number;
  laborHours: number;
  estimatedStartDate: Date;
  estimatedGallons: number;
  startDate: Date;
  status:
  | "Downpayment Pending"
  | "DC Pending"
  | "DC Awaiting Approval"
  | "Ready to Schedule"
  | "Scheduled and Open"
  | "Pending Close"
  | "Closed"
  | "Cancelled";
  createdAt?: Date;
  updatedAt?: Date;
}

// Schema
const jobSchema = new Schema<JobDocument>(
  {
    salesRepId: { type: Types.ObjectId, ref: "User", required: true },
    clientId: { type: Types.ObjectId, ref: "Client", required: true },
    quoteId: { type: Types.ObjectId, ref: "Quote", required: true },
    productionManagerId: { type: Types.ObjectId, ref: "User" },
    contractUrl: { type: String, trim: true, required: true },
    customJobId: { type: String, unique: true },
    title: { type: String, required: true },
    price: { type: Number, required: true },
    downPayment: { type: Number, required: true },
    budgetSpent: { type: Number, default: 0 },
    totalHours: { type: Number, required: true },
    setupCleanup: { type: Number, required: true },
    powerwash: { type: Number, required: true },
    laborHours: { type: Number, required: true },
    estimatedStartDate: { type: Date, required: true },
    estimatedGallons: { type: Number, required: true },
    startDate: { type: Date },
    status: {
      type: String,
      enum: [
        "Downpayment Pending",
        "DC Pending",
        "DC Awaiting Approval",
        "Ready to Schedule",
        "Scheduled and Open",
        "Pending Close",
        "Closed",
        "Cancelled",
      ],
      default: "Downpayment Pending",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index for faster queries
jobSchema.index({ salesRepId: 1 });

// Virtuals
jobSchema.virtual("notes", {
  ref: "ClientNote",
  localField: "_id",
  foreignField: "jobId",
});

jobSchema.virtual("designConsultation", {
  ref: "DesignConsultation",
  localField: "_id",
  foreignField: "jobId",
});

// Pre-save hook to generate customJobId
jobSchema.pre<JobDocument>("save", async function (next) {
  this.laborHours =
    (this.totalHours || 0) -
    (this.powerwash || 0) -
    (this.setupCleanup || 0);
  if (!this.customJobId) {
    this.customJobId = await commonService.generateSequentialId("J", "job");
  }
});

export const Job = model<JobDocument>("Job", jobSchema);

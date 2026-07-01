import { Document, Schema, Types, model } from "mongoose";

export interface RainDelayHistory {
  delayDays: number;
  reason?: string;
  appliedAt: Date;
  appliedBy: Types.ObjectId;
  affectedFromDate: Date;
}

export interface ProductionScheduleDocument extends Document {
  job: Types.ObjectId;
  client: Types.ObjectId;
  quote?: Types.ObjectId;
  crew: Types.ObjectId;
  startDate: Date;
  endDate: Date;
  durationDays: number;
  estimatedLaborHours: number;
  laborCapacityPerDay: number;
  status: "Scheduled and Open" | "Pending Close";
  scheduleSegments?: any[];
  displayOrder?: number;
  jobSiteLocation?: string;
  notes?: string;
  rainDelayHistory: RainDelayHistory[];
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const rainDelayHistorySchema = new Schema<RainDelayHistory>(
  {
    delayDays: { type: Number, required: true },
    reason: { type: String, trim: true },
    appliedAt: { type: Date, required: true },
    appliedBy: { type: Types.ObjectId, ref: "User", required: true },
    affectedFromDate: { type: Date, required: true },
  },
  { _id: false }
);

const productionScheduleSchema = new Schema<ProductionScheduleDocument>(
  {
    job: { type: Types.ObjectId, ref: "Job", required: true, index: true },
    client: { type: Types.ObjectId, ref: "Client", required: true, index: true },
    quote: { type: Types.ObjectId, ref: "Quote" },
    crew: { type: Types.ObjectId, ref: "Crew", required: true, index: true },
    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date, required: true },
    durationDays: { type: Number, required: true, min: 1 },
    estimatedLaborHours: { type: Number, required: true, min: 0 },
    laborCapacityPerDay: { type: Number, default: 22, min: 1 },
    status: {
      type: String,
      enum: ["Scheduled and Open", "Pending Close"],
      default: "Scheduled and Open",
    },
    scheduleSegments: [{ type: Schema.Types.Mixed }],
    displayOrder: { type: Number, default: 0 },
    jobSiteLocation: { type: String, trim: true },
    notes: { type: String, trim: true },
    rainDelayHistory: { type: [rainDelayHistorySchema], default: [] },
    createdBy: { type: Types.ObjectId, ref: "User" },
    updatedBy: { type: Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

productionScheduleSchema.index({ crew: 1, startDate: 1, status: 1 });
productionScheduleSchema.index({ job: 1 });

export const ProductionSchedule = model<ProductionScheduleDocument>(
  "ProductionSchedule",
  productionScheduleSchema
);

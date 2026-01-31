import { model, Schema, Types, Document } from "mongoose";

export interface DesignConsultationDocument extends Document {
  clientId: Types.ObjectId;
  jobId: Types.ObjectId;
  contractUrl?: string;

  // Product details
  product?: string;
  colorCode?: string;
  estimatedGallons?: number;

  // Upsell
  upsellDescription?: string;
  upsellValue?: string;
  addedHours?: number;

  // Scheduling
  estimatedStartDate?: Date;

  createdAt?: Date;
  updatedAt?: Date;
}

const DesignConsultationSchema = new Schema<DesignConsultationDocument>(
  {
    clientId: {
      type: Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },
    jobId: {
      type: Types.ObjectId,
      ref: "Job",
      required: true,
      index: true,
    },
    contractUrl: { type: String, trim: true },

    /* ---------- Product ---------- */
    product: { type: String },
    colorCode: { type: String },
    estimatedGallons: { type: Number },

    /* ---------- Upsell ---------- */
    upsellDescription: { type: String },
    upsellValue: { type: String },
    addedHours: { type: Number },

    /* ---------- Scheduling ---------- */
    estimatedStartDate: { type: Date },

  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

export const DesignConsultation = model<DesignConsultationDocument>(
  "DesignConsultation",
  DesignConsultationSchema
);

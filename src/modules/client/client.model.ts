import { Schema, model, Types } from "mongoose";
import { Document } from "mongoose";
import { commonService } from "../../container";

export interface ClientDocument extends Document {
  salesRepId: Types.ObjectId;
  customClientId: string;
  clientName: string;
  partnerName: string;
  phoneNumber: string;
  email: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  leadSource: "Door to Door" | "Inbound" | "Social";
  leadStatus: "Not quoted" | "Quoted" | "Job";
  rating: number;
  yearBuilt: string;
  createdBy: Types.ObjectId;
}
const clientSchema = new Schema(
  {
    salesRepId: {
      type: Types.ObjectId,
      ref: "User",
    },
    createdBy: {
      type: Types.ObjectId,
      ref: "User",
    },
    customClientId: String,
    clientName: { type: String, required: true },
    partnerName: String,
    phoneNumber: { type: String, required: true },
    email: String,
    address: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, default: "Illinois" },
    zipCode: { type: String, required: true },
    leadSource: {
      type: String,
      enum: ["Door to Door", "Inbound", "Social", ""],
    },
    yearBuilt: { type: String, required: true },
    leadStatus: {
      type: String,
      enum: ["Not quoted", "Quoted", "Job"],
      default: "Not quoted",
    },
    rating: Number,
    callStatus: { type: String, default: "Not Called" },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

clientSchema.index({ salesRepId: 1 });

// Virtuals
clientSchema.virtual("callLogs", {
  ref: "Call",
  localField: "_id",
  foreignField: "clientId",
});

clientSchema.virtual("notes", {
  ref: "ClientNote",
  localField: "_id",
  foreignField: "clientId",
});

clientSchema.virtual("job", {
  ref: "Job",
  localField: "_id",
  foreignField: "clientId",
});

clientSchema.virtual("quote", {
  ref: "Quote",
  localField: "_id",
  foreignField: "clientId",
});

// Pre-save hook for sequential ID
clientSchema.pre<ClientDocument>("save", async function (this: ClientDocument) {
  if (!this.customClientId) {
    this.customClientId = await commonService.generateSequentialId(
      "C",
      "client"
    );
  }
});

export const Client = model("Client", clientSchema);

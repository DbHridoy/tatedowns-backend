import { Schema, model, Types } from "mongoose";

const quoteSchema = new Schema(
  {
    salesRepId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },

    clientId: {
      type: Types.ObjectId,
      ref: "Client",
      required: true,
    },

    estimatedPrice: {
      type: Number,
      min: 0,
      required: true,
    },

    bookedOnSpot: {
      type: Boolean,
      required: true,
    },

    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    bidSheetUrl: {
      type: String,
      required: true,
      trim: true,
    },
  },
  {
    timestamps: true,
    strict: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
quoteSchema.index({ createdAt: -1 });
quoteSchema.index({ salesRepId: 1, status: 1 });

quoteSchema.virtual("notes", {
  ref: "ClientNote",
  localField: "clientId",
  foreignField: "clientId",
});
export const Quote = model("Quote", quoteSchema);

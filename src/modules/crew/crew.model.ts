import { Schema, model, Types, Document } from "mongoose";
import { commonService } from "../../container";

export interface CrewDocument extends Document {
  customCrewId: string;
  name: string;
  description?: string;
  status: "Active" | "Inactive";
  painters: Types.ObjectId[];
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const crewSchema = new Schema<CrewDocument>(
  {
    customCrewId: { type: String, unique: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
    painters: [{ type: Types.ObjectId, ref: "User" }],
    createdBy: { type: Types.ObjectId, ref: "User" },
    updatedBy: { type: Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

crewSchema.index({ name: 1 });
crewSchema.index({ status: 1 });

crewSchema.pre<CrewDocument>("save", async function (this: CrewDocument) {
  if (!this.customCrewId) {
    this.customCrewId = await commonService.generateSequentialId("CR", "crew");
  }
});

export const Crew = model<CrewDocument>("Crew", crewSchema);

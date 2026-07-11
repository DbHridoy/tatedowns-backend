import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      index: true,
      unique: true,
    },
    role: {
      type: String,
      required: true,
      enum: ["Admin", "Sales Rep", "Production Manager", "Painter"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    profileImage: {
      type: String,
    },
    phoneNumber: {
      type: String,
    },
    hourlyRate: {
      type: Number,
      min: 0,
      default: 0,
    },
    address: {
      type: String,
    },
    cluster: {
      type: String,
    },
    password: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for SalesRep
userSchema.virtual("salesRep", {
  ref: "SalesRep", // The model to use
  localField: "_id", // Find SalesRep where `userId` equals `_id`
  foreignField: "userId",
  justOne: true, // Return a single object
});

// Virtual for ProductionManager
userSchema.virtual("productionManager", {
  ref: "ProductionManager",
  localField: "_id",
  foreignField: "userId",
  justOne: true,
});

userSchema.virtual("admin", {
  ref: "Admin",
  localField: "_id",
  foreignField: "userId",
  justOne: true,
});

userSchema.virtual("payments", {
  ref: "SalesRepPayment",
  localField: "_id",
  foreignField: "salesRepId",
});

const User = model("User", userSchema);

export default User;

import { Schema, Types, model } from "mongoose";

const adminSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const Admin = model("Admin", adminSchema);

export default Admin;

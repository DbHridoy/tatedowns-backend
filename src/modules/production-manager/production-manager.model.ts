import { Schema, Types, model } from "mongoose";

const productionManagerSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

const ProductionManager = model("ProductionManager", productionManagerSchema);

export default ProductionManager;

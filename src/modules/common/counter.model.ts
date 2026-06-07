import { model, Schema } from "mongoose";

const CounterSchema = new Schema(
  {
    name: { type: String, required: true, unique: true }, // e.g., "client", "job", "quote"
    seq: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Counter = model("Counter", CounterSchema);
export default Counter;

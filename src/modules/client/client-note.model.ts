import { model, Schema, Types, Document } from "mongoose";

export interface ClientNoteDocument extends Document {
  clientId: Types.ObjectId;
  quoteId: Types.ObjectId;
  jobId: Types.ObjectId;
  note?: string;
  file?: string;
  createdBy: Types.ObjectId;
}

const ClientNoteSchema = new Schema<ClientNoteDocument>(
  {
    clientId: {
      type: Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },
    quoteId: {
      type: Types.ObjectId,
      ref: "Quote",
      index: true,
    },
    jobId: {
      type: Types.ObjectId,
      ref: "Job",
      index: true,
    },
    createdBy: {
      type: Types.ObjectId,
      ref: "User",
    },
    note: {
      type: String,
      trim: true,
    },
    file: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const ClientNote = model<ClientNoteDocument>("ClientNote", ClientNoteSchema);

export default ClientNote;

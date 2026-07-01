import { z } from "zod";

/* ------------------------------------
   Common ObjectId validator
------------------------------------ */
export const ObjectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId");

/* ------------------------------------
   Job Status Enum
------------------------------------ */
export const JobStatusEnum = z.enum([
  "Downpayment Pending",
  "DC Pending",
  "DC Awaiting Approval",
  "Ready to Schedule",
  "Scheduled and Open",
  "Pending Close",
  "Closed",
  "Cancelled",
]);

/* ------------------------------------
   CREATE JOB
------------------------------------ */
export const CreateJobSchema = z
  .object({
    clientId: ObjectIdSchema,
    salesRepId: ObjectIdSchema,
    quoteId: ObjectIdSchema,

    title: z.string().min(1, "Job title is required"),

    description: z.string().optional(),

    estimatedPrice: z.coerce
      .number()
      .positive("Estimated price must be greater than 0"),

    downPayment: z.coerce
      .number()
      .min(0, "Down payment cannot be negative"),

    startDate: z.coerce.date(),

    status: JobStatusEnum.default("Downpayment Pending"),
  })
  .strict();

/* ------------------------------------
   UPDATE JOB
------------------------------------ */
export const UpdateJobSchema = CreateJobSchema
  .omit({
    clientId: true,
    salesRepId: true,
    quoteId: true,
  })
  .partial()
  .strict();

/* ------------------------------------
   CREATE JOB NOTE
------------------------------------ */
export const CreateJobNoteSchema = z
  .object({
    jobId: ObjectIdSchema,
    note: z.string().min(1, "Note is required"),
    file: z.string().optional(),
  })
  .strict();

import { z } from "zod";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");
const dateStringSchema = z.string().refine((value: string) => !Number.isNaN(new Date(value).getTime()), {
  message: "Invalid date",
});

export const ScheduleJobSchema = z.object({
  jobId: objectIdSchema,
  crewId: objectIdSchema,
  startDate: dateStringSchema,
  durationDays: z.coerce.number().int().positive().optional(),
  laborCapacityPerDay: z.coerce.number().positive().optional(),
  notes: z.string().trim().optional(),
  displayOrder: z.coerce.number().int().nonnegative().optional(),
});

export const UpdateScheduleSchema = z.object({
  crewId: objectIdSchema.optional(),
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
  durationDays: z.coerce.number().int().positive().optional(),
  laborCapacityPerDay: z.coerce.number().positive().optional(),
  status: z.enum(["Not Started", "In Progress", "Delayed", "Completed"]).optional(),
  notes: z.string().trim().optional(),
  displayOrder: z.coerce.number().int().nonnegative().optional(),
});

export const UpdateScheduleStatusSchema = z.object({
  status: z.enum(["Not Started", "In Progress", "Delayed", "Completed"]),
});

export const RainDelaySchema = z.object({
  delayDays: z.coerce.number().int().positive(),
  affectedFromDate: dateStringSchema.optional(),
  reason: z.string().trim().optional(),
});

export const CalendarQuerySchema = z.object({
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
  viewMode: z.enum(["twoWeeks", "month", "threeMonths"]).optional(),
  crewId: objectIdSchema.optional(),
  status: z.enum(["Not Started", "In Progress", "Delayed", "Completed"]).optional(),
  search: z.string().optional(),
}).passthrough();

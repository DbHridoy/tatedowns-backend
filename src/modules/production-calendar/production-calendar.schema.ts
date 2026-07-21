import { z } from "zod";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");
const dateStringSchema = z.string().refine((value: string) => !Number.isNaN(new Date(value).getTime()), {
  message: "Invalid date",
});
const painterHoursEntrySchema = z.object({
  painterId: objectIdSchema,
  hours: z.coerce.number().min(0),
});
const materialExpenseEntrySchema = z.object({
  description: z.string().trim().min(1),
  amount: z.coerce.number().min(0),
  expenseDate: dateStringSchema,
  note: z.string().trim().optional(),
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
  action: z.enum([
    "changeStartDate",
    "changeCrew",
    "addExtraDays",
    "returnToReady",
    "cancelJob",
    "markPendingClose",
    "markWeekendException",
  ]).optional(),
  crewId: objectIdSchema.optional(),
  startDate: dateStringSchema.optional(),
  endDate: dateStringSchema.optional(),
  effectiveDate: dateStringSchema.optional(),
  workDate: dateStringSchema.optional(),
  durationDays: z.coerce.number().int().positive().optional(),
  laborCapacityPerDay: z.coerce.number().positive().optional(),
  extraDays: z.coerce.number().int().positive().optional(),
  closeGap: z.coerce.boolean().optional(),
  status: z.enum(["Scheduled and Open", "Pending Close"]).optional(),
  notes: z.string().trim().optional(),
  reason: z.string().trim().optional(),
  displayOrder: z.coerce.number().int().nonnegative().optional(),
  painterHours: z.array(painterHoursEntrySchema).optional(),
  materialExpenses: z.array(materialExpenseEntrySchema).optional(),
});

export const UpdateScheduleStatusSchema = z.object({
  status: z.enum(["Scheduled and Open", "Pending Close"]),
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
  status: z.enum(["Scheduled and Open", "Pending Close"]).optional(),
  search: z.string().optional(),
}).passthrough();

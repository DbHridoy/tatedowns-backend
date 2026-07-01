import { z } from "zod";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

export const CreateCrewSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().trim().optional(),
  status: z.enum(["Active", "Inactive"]).optional(),
  painters: z.array(objectIdSchema).optional(),
});

export const UpdateCrewSchema = CreateCrewSchema.partial();

export const AssignPainterSchema = z.object({
  painterId: objectIdSchema,
});

export const CrewQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().nonnegative().optional(),
  sort: z.string().optional(),
  search: z.string().optional(),
  status: z.enum(["Active", "Inactive"]).optional(),
}).passthrough();

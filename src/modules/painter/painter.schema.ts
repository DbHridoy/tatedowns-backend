import { z } from "zod";

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ObjectId");

export const CreatePainterSchema = z.object({
  fullName: z.string().trim().min(1),
  email: z.string().email(),
  password: z.string().min(1),
  phoneNumber: z.string().optional(),
  hourlyRate: z.coerce.number().min(0).optional(),
  address: z.string().optional(),
  profileImage: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const UpdatePainterSchema = z.object({
  fullName: z.string().trim().min(1).optional(),
  email: z.string().email().optional(),
  password: z.string().min(1).optional(),
  phoneNumber: z.string().optional(),
  hourlyRate: z.coerce.number().min(0).optional(),
  address: z.string().optional(),
  profileImage: z.string().optional(),
  isActive: z.boolean().optional(),
});

export const PainterParamSchema = z.object({
  id: objectIdSchema,
});

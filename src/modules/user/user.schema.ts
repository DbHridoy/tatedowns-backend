import { z } from "zod";

// Base user schema
const UserSchema = z.object({
  fullName: z.string(),
  email: z.string().email(), // fixed
  phoneNumber: z.string(),
  hourlyRate: z.coerce.number().min(0),
  address: z.string(),
  cluster: z.string(),
  role: z.enum(["Admin", "Sales Rep", "Production Manager", "Painter"]),
  password: z.string(),
  profileImage: z.string(),
  isActive: z.boolean(),
});

// Schema for updating user (other roles) — role and cluster omitted, all optional
export const UpdateUserSchemaForOtherRoles = UserSchema.omit({
  role: true,
  cluster: true,
}).partial();

// Schema for creating user — phoneNumber, address, profileImage omitted, cluster optional
export const CreateUserSchema = UserSchema.omit({
  phoneNumber: true,
  address: true,
  profileImage: true,
  isActive: true,
}).extend({
  cluster: z.string().optional(),
  isActive: z.boolean().optional(),
  hourlyRate: z.coerce.number().min(0).optional(),
});

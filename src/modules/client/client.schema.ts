import z from "zod";

export const ClientSchema = z.object({
  clientName: z.string(),
  partnerName: z.string(),
  phoneNumber: z.string(),
  email: z.email(),
  address: z.string(),
  city: z.string(),
  state: z.string().default("Illinois"),
  zipCode: z.string(),
  leadSource: z.string(),
  rating: z.number(),
});

export const CallLogSchema = z.object({
  callAt: z.coerce.date(),
  status: z.enum([
    "Not Called",
    "Picked-Up: Appointment Booked",
    "Picked-Up: No Appointment",
    "No Pickup",
  ]),
  reason: z.string().optional(),
  note: z.string().optional(),
});

export const ClientNoteSchema = z
  .object({
    text: z.string(),
  })
  .optional();

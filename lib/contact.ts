import { z } from "zod";

export const contactSchema = z.object({
  parentName: z.string().trim().min(1, "Name is required").max(120),
  email: z.string().trim().email("Enter a valid email").max(160),
  phone: z.string().trim().max(40).optional().default(""),
  athleteAge: z
    .preprocess((value) => {
      if (value === undefined || value === null || value === "") return undefined;
      const n = typeof value === "number" ? value : Number(value);
      return Number.isFinite(n) ? n : undefined;
    }, z.number().int().min(3).max(21).optional()),
  message: z.string().trim().min(5, "Message is required").max(2000),
  /** Honeypot — must stay empty. */
  company: z.string().max(0).optional().default(""),
});

export type ContactInput = z.infer<typeof contactSchema>;

import { z } from "zod";

export const settingsSchema = z.object({
  shopName: z.string().trim().min(1, { error: "Enter the shop name" }).max(60, { error: "Keep it under 60 characters" }),
  contactNumber: z.string().trim().max(30, { error: "Keep it under 30 characters" }),
  address: z.string().trim().max(120, { error: "Keep it under 120 characters" }),
  receiptFooter: z.string().trim().max(80, { error: "Keep it under 80 characters" }),
});

export type Settings = z.infer<typeof settingsSchema>;

import { z } from "zod";

export const createAddressSchema = z.object({
  label: z.string().trim().max(120).nullable().optional(),
  line1: z.string().trim().min(1),
  city: z.string().trim().max(120).nullable().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  isDefault: z.boolean().optional(),
});

export const updateAddressSchema = z.object({
  label: z.string().trim().max(120).nullable().optional(),
  line1: z.string().trim().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  isDefault: z.boolean().optional(),
});

export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;

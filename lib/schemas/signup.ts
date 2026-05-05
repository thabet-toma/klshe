import { z } from "zod";

export const onboardingRequestSchema = z.object({
  requestedRole: z.enum(["customer", "vendor_staff", "driver"]),
  fullName: z.string().max(120).optional(),
  phone: z.string().max(40).optional(),
  vendorName: z.string().max(120).optional(),
  note: z.string().max(600).optional(),
});

export type OnboardingRequestInput = z.infer<typeof onboardingRequestSchema>;

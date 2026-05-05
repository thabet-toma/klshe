import { z } from "zod";

export const createPayoutSchema = z.object({
  amountShekel: z.number().positive().optional(),
  amountAgorot: z.number().int().positive().optional(),
  note: z.string().max(500).optional(),
});

export type CreatePayoutInput = z.infer<typeof createPayoutSchema>;

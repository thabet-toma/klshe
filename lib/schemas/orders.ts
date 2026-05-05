import { z } from "zod";

export const cartLineSchema = z.object({
  productId: z.string().min(1),
  name: z.string().min(1),
  price: z.number().nonnegative(),
  unit: z.string().min(1),
  image: z.string().min(1),
  quantity: z.number().int().positive(),
  vendorName: z.string().optional(),
});

export const createOrderSchema = z.object({
  addressId: z.string().trim().min(1).nullable().optional(),
  customerName: z.string().trim().min(1),
  customerPhone: z.string().trim().min(1),
  customerAddress: z.string().trim().min(1),
  locationLat: z.number().nullable().optional(),
  locationLng: z.number().nullable().optional(),
  subtotal: z.number().nonnegative(),
  deliveryFee: z.number().nonnegative(),
  discountAmount: z.number().nonnegative().optional(),
  couponCode: z.string().trim().optional(),
  total: z.number().nonnegative(),
  paymentMethod: z.enum(["cash", "card"]),
  notes: z.string().optional(),
  items: z.array(cartLineSchema).min(1),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

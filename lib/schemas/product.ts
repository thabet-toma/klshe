import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().trim().min(1),
  brand: z.string().optional(),
  price: z.number().nonnegative().optional(),
  oldPrice: z.number().nonnegative().nullable().optional(),
  unit: z.string().trim().optional(),
  image: z.string().trim().optional(),
  badge: z.enum(["خصم", "جديد", "الأكثر مبيعاً"]).nullable().optional(),
  categoryId: z.string().trim().min(1),
  vendorId: z.string().trim().optional(),
  menuCategoryId: z.string().trim().nullable().optional(),
  isOffer: z.boolean().optional(),
  isTrending: z.boolean().optional(),
  isActive: z.boolean().optional(),
  priceAgorot: z.number().int().nonnegative().optional(),
  oldPriceAgorot: z.number().int().nonnegative().nullable().optional(),
});

export const updateProductSchema = z.object({
  name: z.string().trim().optional(),
  brand: z.string().nullable().optional(),
  price: z.number().nonnegative().optional(),
  oldPrice: z.number().nonnegative().nullable().optional(),
  unit: z.string().trim().optional(),
  image: z.string().trim().optional(),
  badge: z.enum(["خصم", "جديد", "الأكثر مبيعاً"]).nullable().optional(),
  categoryId: z.string().trim().nullable().optional(),
  vendorId: z.string().trim().optional(),
  vendorCategoryId: z.string().trim().optional(),
  menuCategoryId: z.string().trim().nullable().optional(),
  isOffer: z.boolean().optional(),
  isTrending: z.boolean().optional(),
  isActive: z.boolean().optional(),
  priceAgorot: z.number().int().nonnegative().optional(),
  oldPriceAgorot: z.number().int().nonnegative().nullable().optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

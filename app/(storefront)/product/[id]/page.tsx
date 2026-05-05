import { notFound } from "next/navigation";
import ProductDetails from "../../../components/storefront/ProductDetails";
import { getProductById, getRelatedProducts } from "@/lib/supabase/storefront";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();

  const related = await getRelatedProducts(product.categoryId, product.id);

  return <ProductDetails product={product} related={related} />;
}

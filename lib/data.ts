export type Banner = {
  id: string;
  title: string;
  subtitle: string;
  cta: string;
  image: string;
  gradient: string;
};

export type Category = {
  id: string;
  /** للروابط النظيفة، مثل /category/grocery */
  slug: string;
  name: string;
  emoji: string;
  color: string;
};

export type Product = {
  id: string;
  name: string;
  brand?: string;
  price: number;
  oldPrice?: number;
  unit: string;
  image: string;
  badge?: "خصم" | "جديد" | "الأكثر مبيعاً";
  categoryId: string;
  /** معرف المتجر — مطلوب لسلة أحادية المتجر؛ إن غاب يُستخدم المتجر الافتراضي في السلة. */
  vendorId?: string;
  /** للعرض على البطاقة عند الجلب من قاعدة البيانات مع المتجر. */
  vendorName?: string;
  vendorSlug?: string;
};

export const banners: Banner[] = [
  {
    id: "b1",
    title: "خصم 30% على البقالة",
    subtitle: "اطلب الآن واستمتع بتوصيل خلال 30 دقيقة",
    cta: "تسوق الآن",
    image:
      "https://images.unsplash.com/photo-1542838132-92c53300491e?w=900&q=80&auto=format&fit=crop",
    gradient: "from-orange-500 via-pink-500 to-violet-600",
  },
  {
    id: "b2",
    title: "وجبتك المفضلة بنقرة",
    subtitle: "أكثر من 1000 مطعم متاحة الآن في منطقتك",
    cta: "اطلب وجبتك",
    image:
      "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=900&q=80&auto=format&fit=crop",
    gradient: "from-rose-500 via-orange-500 to-amber-400",
  },
  {
    id: "b3",
    title: "صيدلية 24/7",
    subtitle: "أدوية ومستلزمات صحية تصلك بسرعة",
    cta: "اطلب الآن",
    image:
      "https://images.unsplash.com/photo-1576602976047-174e57a47881?w=900&q=80&auto=format&fit=crop",
    gradient: "from-emerald-500 via-teal-500 to-cyan-500",
  },
];

export const categories: Category[] = [
  { id: "c1", slug: "c1", name: "بقالة", emoji: "🛒", color: "from-orange-100 to-orange-200" },
  { id: "c2", slug: "c2", name: "مطاعم", emoji: "🍔", color: "from-rose-100 to-rose-200" },
  { id: "c3", slug: "c3", name: "خضار وفواكه", emoji: "🥬", color: "from-lime-100 to-emerald-200" },
  { id: "c4", slug: "c4", name: "حلويات", emoji: "🍰", color: "from-pink-100 to-fuchsia-200" },
  { id: "c5", slug: "c5", name: "صيدلية", emoji: "💊", color: "from-emerald-100 to-teal-200" },
  { id: "c6", slug: "c6", name: "مشروبات", emoji: "🥤", color: "from-sky-100 to-indigo-200" },
  { id: "c7", slug: "c7", name: "لحوم وأسماك", emoji: "🥩", color: "from-red-100 to-orange-200" },
  { id: "c8", slug: "c8", name: "مخبوزات", emoji: "🥖", color: "from-amber-100 to-yellow-200" },
  { id: "c9", slug: "c9", name: "ألبان وأجبان", emoji: "🧀", color: "from-yellow-100 to-amber-200" },
  { id: "c10", slug: "c10", name: "تنظيف", emoji: "🧴", color: "from-cyan-100 to-blue-200" },
];

export const trending: Product[] = [
  {
    id: "p1",
    name: "تفاح أحمر طازج",
    brand: "محلي",
    price: 2500,
    oldPrice: 3000,
    unit: "1 كغ",
    image:
      "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=500&q=80&auto=format&fit=crop",
    badge: "خصم",
    categoryId: "c3",
  },
  {
    id: "p2",
    name: "حليب طازج كامل الدسم",
    brand: "البان الريف",
    price: 1500,
    unit: "1 لتر",
    image:
      "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=500&q=80&auto=format&fit=crop",
    badge: "الأكثر مبيعاً",
    categoryId: "c9",
  },
  {
    id: "p3",
    name: "خبز بلدي ساخن",
    price: 750,
    unit: "5 أرغفة",
    image:
      "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&q=80&auto=format&fit=crop",
    badge: "جديد",
    categoryId: "c8",
  },
  {
    id: "p4",
    name: "موز إكوادوري",
    price: 1750,
    oldPrice: 2000,
    unit: "1 كغ",
    image:
      "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=500&q=80&auto=format&fit=crop",
    badge: "خصم",
    categoryId: "c3",
  },
  {
    id: "p5",
    name: "برغر دجاج عائلي",
    brand: "مطعم الذواقة",
    price: 6500,
    unit: "وجبة",
    image:
      "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&q=80&auto=format&fit=crop",
    badge: "الأكثر مبيعاً",
    categoryId: "c2",
  },
  {
    id: "p6",
    name: "عصير برتقال طبيعي",
    brand: "نكهة",
    price: 2000,
    unit: "1 لتر",
    image:
      "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=500&q=80&auto=format&fit=crop",
    categoryId: "c6",
  },
  {
    id: "p7",
    name: "كيكة الشوكولاتة",
    brand: "حلويات السراج",
    price: 8500,
    oldPrice: 10000,
    unit: "قطعة",
    image:
      "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=500&q=80&auto=format&fit=crop",
    badge: "خصم",
    categoryId: "c4",
  },
  {
    id: "p8",
    name: "بيض طازج",
    brand: "مزارع الوطن",
    price: 3000,
    unit: "30 حبة",
    image:
      "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=500&q=80&auto=format&fit=crop",
    categoryId: "c1",
  },
];

export const offersToday: Product[] = [
  {
    id: "o1",
    name: "زيت زيتون بكر ممتاز",
    brand: "زيتون الجبل",
    price: 12500,
    oldPrice: 15000,
    unit: "1 لتر",
    image:
      "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&q=80&auto=format&fit=crop",
    badge: "خصم",
    categoryId: "c1",
    vendorName: "جيتك — المتجر الرئيسي",
    vendorSlug: "jetek-main",
  },
  {
    id: "o2",
    name: "أرز بسمتي فاخر",
    brand: "السلطان",
    price: 4500,
    oldPrice: 5500,
    unit: "5 كغ",
    image:
      "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=500&q=80&auto=format&fit=crop",
    badge: "خصم",
    categoryId: "c1",
    vendorName: "جيتك — المتجر الرئيسي",
    vendorSlug: "jetek-main",
  },
  {
    id: "o3",
    name: "جبنة بيضاء",
    brand: "البان الريف",
    price: 3200,
    oldPrice: 4000,
    unit: "500 غم",
    image:
      "https://images.unsplash.com/photo-1452195100486-9cc805987862?w=500&q=80&auto=format&fit=crop",
    badge: "خصم",
    categoryId: "c9",
    vendorName: "جيتك — المتجر الرئيسي",
    vendorSlug: "jetek-main",
  },
  {
    id: "o4",
    name: "فراولة طازجة",
    price: 3500,
    oldPrice: 4500,
    unit: "500 غم",
    image:
      "https://images.unsplash.com/photo-1543528176-61b239494933?w=500&q=80&auto=format&fit=crop",
    badge: "خصم",
    categoryId: "c3",
    vendorName: "جيتك — المتجر الرئيسي",
    vendorSlug: "jetek-main",
  },
];

export { formatPrice } from "./currency";

export const allProducts: Product[] = [...trending, ...offersToday];
export const productsById = new Map(allProducts.map((item) => [item.id, item]));

export const findProduct = (id: string): Product | undefined =>
  productsById.get(id);

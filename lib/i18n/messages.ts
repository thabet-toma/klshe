import type { AppLocale } from "./config";

export type Messages = {
  common: {
    privacy: string;
    terms: string;
    copyright: string;
  };
  header: {
    deliverTo: string;
    addressesCta: string;
    toggleDarkMode: string;
    notifications: string;
  };
  search: {
    placeholder: string;
    filterSoon: string;
    loading: string;
    stores: string;
    products: string;
    suggestions: string;
  };
  bottomNav: {
    home: string;
    orders: string;
    cart: string;
    favorites: string;
    account: string;
  };
};

const ar: Messages = {
  common: { privacy: "الخصوصية", terms: "الشروط", copyright: "© جيتك" },
  header: {
    deliverTo: "التوصيل إلى",
    addressesCta: "عناويني وخيارات التوصيل",
    toggleDarkMode: "تبديل الوضع الليلي",
    notifications: "الإشعارات",
  },
  search: {
    placeholder: "ابحث عن منتجات، متاجر، أو مطاعم...",
    filterSoon: "تصفية البحث (قريباً)",
    loading: "جاري البحث…",
    stores: "متاجر",
    products: "منتجات",
    suggestions: "اقتراحات البحث",
  },
  bottomNav: {
    home: "الرئيسية",
    orders: "طلباتي",
    cart: "السلة",
    favorites: "المفضلة",
    account: "حسابي",
  },
};

const he: Messages = {
  common: { privacy: "פרטיות", terms: "תנאים", copyright: "© Jetek" },
  header: {
    deliverTo: "משלוח אל",
    addressesCta: "הכתובות שלי ואפשרויות משלוח",
    toggleDarkMode: "החלפת מצב כהה",
    notifications: "התראות",
  },
  search: {
    placeholder: "חפש מוצרים, חנויות או מסעדות...",
    filterSoon: "סינון חיפוש (בקרוב)",
    loading: "מחפש...",
    stores: "חנויות",
    products: "מוצרים",
    suggestions: "הצעות חיפוש",
  },
  bottomNav: {
    home: "בית",
    orders: "ההזמנות שלי",
    cart: "סל",
    favorites: "מועדפים",
    account: "החשבון שלי",
  },
};

const en: Messages = {
  common: { privacy: "Privacy", terms: "Terms", copyright: "© Jetek" },
  header: {
    deliverTo: "Deliver to",
    addressesCta: "My addresses and delivery options",
    toggleDarkMode: "Toggle dark mode",
    notifications: "Notifications",
  },
  search: {
    placeholder: "Search products, stores, or restaurants...",
    filterSoon: "Filter search (soon)",
    loading: "Searching...",
    stores: "Stores",
    products: "Products",
    suggestions: "Search suggestions",
  },
  bottomNav: {
    home: "Home",
    orders: "My orders",
    cart: "Cart",
    favorites: "Favorites",
    account: "Account",
  },
};

export const messagesByLocale: Record<AppLocale, Messages> = { ar, he, en };

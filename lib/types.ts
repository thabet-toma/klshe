// مفردات الحالة الموحّدة — المصدر الوحيد lib/order-status.ts
import type { OrderStatus } from "./order-status";
export type { OrderStatus };

export type PaymentMethod = "cash" | "card";

export type Driver = {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  vehicle: string;
  rating: number;
  status: "online" | "offline" | "busy";
  todayOrders: number;
  earningsToday: number;
};

export type CartLine = {
  productId: string;
  name: string;
  price: number;
  unit: string;
  image: string;
  quantity: number;
  /** للعرض في واجهة استبدال السلة بين المتاجر */
  vendorName?: string;
};

export type Order = {
  id: string;
  shortCode: string;
  customer: {
    name: string;
    phone: string;
    address: string;
    location: { lat: number; lng: number };
  };
  items: CartLine[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  status: OrderStatus;
  payment: PaymentMethod;
  driverId?: string;
  notes?: string;
  createdAt: string; // ISO
  scheduledFor?: string; // ISO
};

export type Customer = {
  id: string;
  name: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  debt: number; // ديون عليه (آجل)
  lastOrderAt: string;
};

export type Supplier = {
  id: string;
  name: string;
  phone: string;
  category: string;
  totalDue: number; // المتبقي عليّه
};

export type PurchaseInvoice = {
  id: string;
  supplierId: string;
  supplierName: string;
  date: string;
  total: number;
  paid: number;
  status: "paid" | "partial" | "unpaid";
  itemsCount: number;
};

export type SalesInvoice = {
  id: string;
  orderId: string;
  customerName: string;
  date: string;
  total: number;
  payment: PaymentMethod;
  itemsCount: number;
};

export type InventoryItem = {
  productId: string;
  name: string;
  category: string;
  stock: number;
  minStock: number;
  unit: string;
  costPrice: number;
  sellPrice: number;
  image: string;
};

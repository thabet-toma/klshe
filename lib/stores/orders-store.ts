"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Order, OrderStatus } from "../types";
import { initialOrders } from "../mock";

type OrdersState = {
  orders: Order[];
  setStatus: (id: string, status: OrderStatus) => void;
  assignDriver: (id: string, driverId: string) => void;
  add: (order: Order) => void;
  reset: () => void;
};

export const useOrders = create<OrdersState>()(
  persist(
    (set) => ({
      orders: initialOrders,
      setStatus: (id, status) =>
        set((s) => ({
          orders: s.orders.map((o) => (o.id === id ? { ...o, status } : o)),
        })),
      assignDriver: (id, driverId) =>
        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === id
              ? { ...o, driverId, status: "dispatched" as OrderStatus }
              : o,
          ),
        })),
      add: (order) => set((s) => ({ orders: [order, ...s.orders] })),
      reset: () => set({ orders: initialOrders }),
    }),
    {
      name: "jetek-orders",
    },
  ),
);

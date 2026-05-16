import { create } from "zustand";

type DashboardRoute = {
  label: string;
  href: string;
  icon: string;
  description: string;
};

type DashboardState = {
  role: string | null;
  dashboards: DashboardRoute[];
  loading: boolean;
  fetchDashboards: () => Promise<void>;
};

export const useDashboard = create<DashboardState>((set) => ({
  role: null,
  dashboards: [],
  loading: false,
  fetchDashboards: async () => {
    set({ loading: true });
    try {
      const r = await fetch("/api/dashboard", { cache: "no-store" });
      if (!r.ok) return;
      const json = (await r.json()) as { role?: string; dashboards?: DashboardRoute[] };
      set({
        role: json.role ?? null,
        dashboards: json.dashboards ?? [],
      });
    } catch {
      // silent fail — dashboards stay empty
    } finally {
      set({ loading: false });
    }
  },
}));

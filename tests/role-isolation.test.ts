import { describe, expect, it, vi, beforeEach } from "vitest";

// T2.3 — اختباران سلبيان موثّقان لعزل بيانات الأدوار:
//  (1) سائق A لا يقدر يعدّل طلب سائق B  ⇒ 403
//  (2) بائع X لا يقدر يستهدف متجر بائع Y ⇒ يُجبَر على متجره فقط

// ── Mocks مشتركة ──────────────────────────────────────────────
const guardMock = vi.fn();
vi.mock("@/lib/auth/guard", () => ({
  guardOrError: () => guardMock(),
}));
vi.mock("@/lib/push/web-push", () => ({
  sendOrderStatusPush: vi.fn(async () => {}),
}));

const supabaseFixtures: Record<string, { data: unknown; error: unknown }> = {};
function chain(table: string) {
  const result = supabaseFixtures[table] ?? { data: null, error: null };
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq", "is", "order", "limit", "update", "delete", "upsert"]) {
    c[m] = () => c;
  }
  c.maybeSingle = async () => result;
  c.single = async () => result;
  // thenable: يدعم `await supabase.from(t).select().eq()` المباشر
  c.then = (resolve: (v: unknown) => void) => resolve(result);
  return c;
}
vi.mock("@/lib/supabase/server", () => ({
  isSupabaseServerConfigured: true,
  createServerSupabase: () => ({ from: (t: string) => chain(t) }),
}));

const sessionMock = vi.fn();
vi.mock("@/lib/firebase/session", () => ({
  getFirebaseSession: () => sessionMock(),
}));

beforeEach(() => {
  for (const k of Object.keys(supabaseFixtures)) delete supabaseFixtures[k];
  guardMock.mockReset();
  sessionMock.mockReset();
});

describe("T2.3 negative — driver cannot touch another driver's order", () => {
  it("driver A PATCH on driver B's order ⇒ 403", async () => {
    const { PATCH } = await import("@/app/api/driver/orders/[id]/route");

    // الهوية = السائق A
    guardMock.mockResolvedValue({ profileId: "userA", role: "driver" });
    // صفّ السائق A
    supabaseFixtures["delivery_drivers"] = { data: { id: "driverA", status: "online" }, error: null };
    // الطلب مملوك للسائق B
    supabaseFixtures["orders"] = {
      data: { id: "o1", status: "ready", driver_id: "driverB", picked_at: null },
      error: null,
    };

    const req = new Request("http://t/api/driver/orders/o1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "pickup" }),
    });
    const res = await PATCH(req, { params: Promise.resolve({ id: "o1" }) });

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("ليس مخصصاً لك");
  });
});

describe("T2.3 negative — vendor cannot target a foreign store", () => {
  it("pickVendorId ignores a vendorId not owned by the staff member", async () => {
    const { pickVendorId } = await import("@/lib/auth/require-vendor-staff");
    // البائع X يملك متجره vX فقط؛ يطلب متجر vY الأجنبي
    expect(pickVendorId(["vX"], "vY")).toBe("vX");
    expect(pickVendorId(["vX"], null)).toBe("vX");
    expect(pickVendorId(["vX"], "vX")).toBe("vX");
  });

  it("requireVendorAccess denies (403) an account linked to no store", async () => {
    const { requireVendorAccess } = await import("@/lib/auth/require-vendor-staff");
    sessionMock.mockResolvedValue({ profileId: "userY", uid: "uidY" });
    supabaseFixtures["vendor_staff"] = { data: [], error: null };

    const { error, vendorIds } = await requireVendorAccess();
    expect(vendorIds).toHaveLength(0);
    expect(error?.status).toBe(403);
  });
});

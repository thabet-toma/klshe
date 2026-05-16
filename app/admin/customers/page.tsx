import { Phone, ShoppingBag } from "lucide-react";
import AdminShell from "../../components/admin/AdminShell";
import { formatPrice } from "@/lib/data";

// TODO: replace with real customer data from API
const customers: { id: string; name: string; phone: string; totalOrders: number; totalSpent: number; debt: number }[] = [];

export default function AdminCustomersPage() {
  return (
    <AdminShell title="العملاء" subtitle="عرض جميع زبائن المتجر">
      {customers.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-neutral-500 shadow-soft ring-1 ring-black/5">
          لا يوجد عملاء لعرضهم حالياً.
        </div>
      ) : (
        <div className="rounded-2xl bg-white shadow-soft ring-1 ring-black/5">
          <div className="overflow-x-auto">
            <table className="min-w-full text-start text-sm">
              <thead className="border-b border-black/5 text-[12px] font-bold text-neutral-500">
                <tr>
                  <th className="px-4 py-3 text-start">الزبون</th>
                  <th className="px-4 py-3 text-start">الهاتف</th>
                  <th className="px-4 py-3 text-start">الطلبات</th>
                  <th className="px-4 py-3 text-start">الإجمالي المنفق</th>
                  <th className="px-4 py-3 text-start">الديون</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {customers.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-gradient text-sm font-extrabold text-white">
                          {c.name[0]}
                        </span>
                        <p className="text-sm font-extrabold">{c.name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-[12px] font-bold text-neutral-600">
                        <Phone className="h-3.5 w-3.5" strokeWidth={2.4} />
                        {c.phone}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-[12px] font-bold text-neutral-600">
                        <ShoppingBag className="h-3.5 w-3.5" strokeWidth={2.4} />
                        {c.totalOrders}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-extrabold text-brand-600">
                      {formatPrice(c.totalSpent)}
                    </td>
                    <td className="px-4 py-3">
                      {c.debt > 0 ? (
                        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-extrabold text-rose-700 ring-1 ring-rose-200">
                          {formatPrice(c.debt)}
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-neutral-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </AdminShell>
  );
}

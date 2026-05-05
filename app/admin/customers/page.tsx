import { Phone, ShoppingBag } from "lucide-react";
import AdminShell from "../../components/admin/AdminShell";
import { customers } from "@/lib/mock";
import { formatPrice } from "@/lib/data";

export default function AdminCustomersPage() {
  return (
    <AdminShell title="العملاء" subtitle="عرض جميع زبائن المتجر">
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
                  <td className="px-4 py-3 text-neutral-600 font-mono text-[12px]" dir="ltr">
                    <span className="inline-flex items-center gap-1">
                      <Phone className="h-3.5 w-3.5" strokeWidth={2.4} />
                      {c.phone}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-extrabold text-neutral-700">
                      <ShoppingBag className="h-3 w-3" strokeWidth={2.6} />
                      {c.totalOrders}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-extrabold">
                    {formatPrice(c.totalSpent)}
                  </td>
                  <td className="px-4 py-3">
                    {c.debt > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-extrabold text-rose-700">
                        {formatPrice(c.debt)}
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-extrabold text-emerald-700">
                        لا يوجد
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AdminShell>
  );
}

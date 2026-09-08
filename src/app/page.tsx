import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const statusStyles: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  ready: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-zinc-200 text-zinc-600",
};

export default async function Home() {
  const supabase = await createClient();
  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, status, notes, created_at, customers(name), services(name, price_cents)")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-10 sm:px-12">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-zinc-900">Orders</h1>
          <Link
            href="/orders/new"
            className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-medium text-white hover:bg-zinc-700"
          >
            + New Order
          </Link>
        </div>

        {error && (
          <p className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            Couldn&apos;t load orders: {error.message}
          </p>
        )}

        {!error && orders && orders.length === 0 && (
          <p className="mt-10 text-center text-zinc-500">
            No orders yet. Create your first one.
          </p>
        )}

        {!error && orders && orders.length > 0 && (
          <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-100 text-zinc-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Service</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-3 text-zinc-900">
                      {order.customers?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {order.services?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          statusStyles[order.status] ?? "bg-zinc-100 text-zinc-700"
                        }`}
                      >
                        {order.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

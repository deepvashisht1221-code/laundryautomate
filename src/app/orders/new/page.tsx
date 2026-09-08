import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createOrder } from "./actions";

export default async function NewOrderPage() {
  const supabase = await createClient();
  const { data: services } = await supabase
    .from("services")
    .select("id, name, price_cents")
    .order("name");

  return (
    <div className="min-h-screen bg-zinc-50 px-6 py-10 sm:px-12">
      <div className="mx-auto max-w-md">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-700">
          ← Back to orders
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900">New Order</h1>

        <form action={createOrder} className="mt-6 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Customer name
            </label>
            <input
              name="customerName"
              required
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
              placeholder="Jane Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Phone (optional)
            </label>
            <input
              name="customerPhone"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
              placeholder="+1 555 000 0000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Service
            </label>
            <select
              name="serviceId"
              required
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
            >
              <option value="">Select a service</option>
              {services?.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} (${(service.price_cents / 100).toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Notes (optional)
            </label>
            <textarea
              name="notes"
              rows={3}
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none"
              placeholder="Stains on collar, handle with care..."
            />
          </div>

          <button
            type="submit"
            className="mt-2 rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700"
          >
            Create Order
          </button>
        </form>
      </div>
    </div>
  );
}

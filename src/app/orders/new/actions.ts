"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createOrder(formData: FormData) {
  const customerName = String(formData.get("customerName") ?? "").trim();
  const customerPhone = String(formData.get("customerPhone") ?? "").trim();
  const serviceId = String(formData.get("serviceId") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!customerName || !serviceId) {
    throw new Error("Customer name and service are required.");
  }

  const supabase = await createClient();

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .insert({ name: customerName, phone: customerPhone || null })
    .select("id")
    .single();

  if (customerError) {
    throw new Error(customerError.message);
  }

  const { error: orderError } = await supabase.from("orders").insert({
    customer_id: customer.id,
    service_id: serviceId,
    notes: notes || null,
  });

  if (orderError) {
    throw new Error(orderError.message);
  }

  redirect("/");
}

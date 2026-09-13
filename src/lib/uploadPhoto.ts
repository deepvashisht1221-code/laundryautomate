import { supabase } from "@/lib/supabase";

export async function uploadOrderPhoto(
  orderId: string,
  kind: "pickup" | "dropoff" | "payment",
  file: File,
) {
  const path = `${orderId}/${kind}-${crypto.randomUUID()}-${file.name}`;
  const { error } = await supabase.storage.from("order-photos").upload(path, file);
  if (error) throw error;
  const { data } = supabase.storage.from("order-photos").getPublicUrl(path);
  return data.publicUrl;
}

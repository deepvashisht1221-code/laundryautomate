import type { Tables } from "@/types/database";

export const ITEM_CATEGORIES = [
  { key: "shirts", label: "Shirts" },
  { key: "trousers", label: "Trousers" },
  { key: "bedsheets", label: "Bedsheets" },
  { key: "towels", label: "Towels" },
  { key: "innerwear", label: "Innerwear" },
  { key: "other", label: "Other" },
] as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[number]["key"];
export type ItemCounts = Partial<Record<ItemCategory, number>>;

const ITEM_WEIGHT_KG: Record<ItemCategory, number> = {
  shirts: 0.2,
  trousers: 0.35,
  bedsheets: 0.8,
  towels: 0.3,
  innerwear: 0.1,
  other: 0.3,
};

const AVG_BAG_WEIGHT_KG = 3.5;

function totalItems(counts: ItemCounts) {
  return Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0);
}

export function estimateWeightKg(counts: ItemCounts, bagCount: number) {
  if (totalItems(counts) > 0) {
    return (Object.entries(counts) as [ItemCategory, number | undefined][]).reduce(
      (sum, [key, count]) => sum + (count ?? 0) * ITEM_WEIGHT_KG[key],
      0,
    );
  }
  return bagCount * AVG_BAG_WEIGHT_KG;
}

function estimateItemCount(counts: ItemCounts, bagCount: number) {
  const total = totalItems(counts);
  return total > 0 ? total : bagCount;
}

export function estimatePrice(
  service: Pick<Tables<"service_types">, "pricing_unit" | "price">,
  counts: ItemCounts,
  bagCount: number,
) {
  const weightKg = estimateWeightKg(counts, bagCount);
  if (service.pricing_unit === "per_kg") {
    return { amount: Math.round(weightKg * service.price), weightKg };
  }
  return { amount: estimateItemCount(counts, bagCount) * service.price, weightKg };
}

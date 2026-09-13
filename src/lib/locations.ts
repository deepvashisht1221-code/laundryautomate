import type { Enums } from "@/types/database";

const BLOCKS_A_TO_J = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];

export const VILLAGE_BLOCKS: Record<string, string[]> = {
  "Student Village 1": BLOCKS_A_TO_J,
  "Student Village 2": BLOCKS_A_TO_J,
  "Student Village 3": BLOCKS_A_TO_J,
};

export const FLOORS = ["Ground floor", "1st floor", "2nd floor", "3rd floor", "4th floor"];

export const PICKUP_POINTS: {
  value: Enums<"pickup_point_type">;
  title: string;
  description: string;
}[] = [
  {
    value: "room_door",
    title: "At my room door",
    description: "We'll knock. Best if you're usually in.",
  },
  {
    value: "block_reception",
    title: "Block reception",
    description: "Leave your bag with the desk. Most reliable.",
  },
  {
    value: "common_room",
    title: "Common room",
    description: "Drop it at the laundry shelf.",
  },
];

export function pickupPointLabel(value: Enums<"pickup_point_type"> | null) {
  return PICKUP_POINTS.find((p) => p.value === value)?.title ?? "Not set";
}

import type { Enums } from "@/types/database";

export const VILLAGE_BLOCKS: Record<string, string[]> = {
  "Student Village 1": ["D1", "D2", "D3", "D4", "D5", "D6", "D7", "D8"],
  "Student Village 2": ["E1", "E2", "E3", "E4", "E5", "E6"],
  "Student Village 3": ["F1", "F2", "F3", "F4", "F5", "F6"],
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

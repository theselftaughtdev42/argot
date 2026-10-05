import type { Passage } from "./engine";

/**
 * A passage wb can play a run on. `id` and `title` aren't shown yet; they're
 * there for a future picker or per-passage best times.
 */
export interface TitledPassage {
  id: string;
  title: string;
  /** Broken by hand, each 60 characters or fewer. */
  lines: Passage;
}

// Placeholders until there are real passages. They stick to `,` `.` `'` and
// `-` and use contractions, so vim's word rules come up often.
export const PASSAGES: readonly TitledPassage[] = [
  {
    id: "fox",
    title: "The fox",
    lines: [
      "The fox didn't wait for the bus. It ran, quick and low,",
      "across the half-frozen field. Nobody saw it go - not the",
      "farmer, not the dog, not even the crows. By dawn, it was",
      "home again, warm, fed and fast asleep.",
    ],
  },
  {
    id: "kettle",
    title: "The kettle",
    lines: [
      "She's put the kettle on twice now, and it's still cold.",
      "The switch clicks, the light comes on, then nothing - no",
      "hiss, no rumble, not a single bubble. She'll try the one",
      "in the shed. It's old and dented, but it's never let her",
      "down, not once in twenty-odd years.",
    ],
  },
  {
    id: "lighthouse",
    title: "The lighthouse",
    lines: [
      "The keeper's last night on the rock was a quiet one.",
      "He wound the clock, wiped the lens and wrote the log.",
      "Wind - light, north-east. Sea - calm. Ships - none.",
      "At first light he'd row back to the mainland, and the",
      "lamp would turn on its own. He didn't sleep. He sat by",
      "the glass and watched it sweep the dark, round and round.",
    ],
  },
];

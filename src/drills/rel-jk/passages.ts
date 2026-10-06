import type { Passage } from "./engine";

/**
 * A passage rel-jk can play a run on. `id` and `title` aren't shown yet;
 * they're there for a future picker or per-passage best times.
 */
export interface TitledPassage {
  id: string;
  title: string;
  /** Broken by hand, each 60 characters or fewer. Blank lines are paragraph breaks. */
  lines: Passage;
}

// Placeholders until there are real passages, about 20 lines each so every
// target fits on screen. Blank lines come up as targets too.
export const PASSAGES: readonly TitledPassage[] = [
  {
    id: "allotment",
    title: "The allotment",
    lines: [
      "Every Saturday, rain or shine, Mo walks down to plot nine.",
      "She takes a flask of tea, a trowel and a bag of seed,",
      "and she stays until the light starts to go.",
      "",
      "The beans came up first this year, then the peas, then",
      "a row of carrots that the slugs got to before she did.",
      "She doesn't mind. There's always next year, she says,",
      "and there's always more seed.",
      "",
      "Her neighbour on plot ten grows nothing but dahlias.",
      "Huge ones, red and orange and a purple so dark it's",
      "nearly black. He won't say what he feeds them. Mo has",
      "her theories, but she keeps them to herself.",
      "",
      "In August the whole site smells of tomatoes and cut",
      "grass. People swap courgettes over the fences, because",
      "nobody has ever grown just enough courgettes.",
      "",
      "By October it's mostly mud. Mo still goes down. She",
      "says the robins expect her.",
    ],
  },
  {
    id: "night-bus",
    title: "The night bus",
    lines: [
      "The N38 leaves the stop at ten past two, give or take.",
      "Tonight it's taking. The driver is eating a sandwich",
      "and reading something on his phone, and he doesn't look",
      "up when the doors hiss open.",
      "",
      "Upstairs, a man in a suit is asleep against the window.",
      "Two students share a bag of chips and argue about a",
      "film neither of them has seen. A woman knits something",
      "long and green that pools on the seat beside her.",
      "",
      "At the bridge the bus slows to a crawl. Nobody minds.",
      "The river is black and still, and the lights on the far",
      "side shake in it like they're cold.",
      "",
      "The man in the suit wakes with a start, checks the",
      "window, swears quietly and runs for the stairs. He's",
      "missed his stop. He'll miss it again next week.",
      "",
      "The knitting grows another inch. The chips run out.",
      "The bus goes on, the way it always does.",
    ],
  },
  {
    id: "workshop",
    title: "The workshop",
    lines: [
      "Grandad's workshop was a shed at the bottom of the garden",
      "that smelled of sawdust, oil and old coffee.",
      "",
      "Every tool had a place on the wall, drawn round in black",
      "pen so you'd know if one was missing. One always was.",
      "Usually the small screwdriver. Usually I had it.",
      "",
      "He made things for the house: a shelf, a stool, a box",
      "for the cutlery with a lid that slid shut. He made a",
      "bird table that the squirrels took over in a week.",
      "He made them a ladder after that, to be fair to them.",
      "",
      "He never used a plan. He'd look at the wood for a while,",
      "turn it over, look again, then start cutting. Measure",
      "twice, he said, and then he'd measure once.",
      "",
      "The shed's still there. The outlines are still on the",
      "wall, mostly empty now. I put the small screwdriver",
      "back last spring, in its place, where it belongs.",
      "It felt like the right thing to do.",
    ],
  },
];

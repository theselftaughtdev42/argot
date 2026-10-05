import { createRun, move, type Motion, type Passage, type RunState } from "./engine";
import { motionFor } from "./input";
import { Timer } from "../shared/timer";
import { getBestTime, isNewBest as wouldBeNewBest, saveBestTimeIfBetter } from "../shared/storage";
import { renderPlay, renderElapsed, renderResults } from "./renderer";
import type { DrillScreen, DrillSession } from "../registry";

const DRILL = "wb";

// A stand-in until there's a list of passages to pick from.
const PASSAGE: Passage = [
  "The fox didn't wait for the bus; it ran, quick and low,",
  "across the half-frozen field. Nobody saw it go - not",
  "the farmer, not the dog, not even the crows (who see",
  "everything). By dawn, it was home: warm, fed and asleep.",
];

export function mountWbDrill(
  root: HTMLElement,
  onScreenChange: (screen: DrillScreen) => void,
): DrillSession {
  let state: RunState = createRun(PASSAGE);
  let screen: DrillScreen = "play";
  let finalTimeMs = 0;
  let isNewBest = false;
  let animationFrame = 0;
  const timer = new Timer();

  function tick(): void {
    if (screen !== "play") return;
    renderElapsed(root, timer.elapsedMs());
    animationFrame = requestAnimationFrame(tick);
  }

  function handleMove(motion: Motion): void {
    timer.start();
    state = move(state, motion);
    if (state.status === "complete") {
      timer.stop();
      cancelAnimationFrame(animationFrame);
      finalTimeMs = timer.elapsedMs();
      isNewBest = wouldBeNewBest(DRILL, finalTimeMs);
      screen = "results";
      onScreenChange("results");
      renderResults(root, finalTimeMs, isNewBest, getBestTime(DRILL));
    } else {
      renderPlay(root, state, timer.elapsedMs());
    }
  }

  function startRun(): void {
    state = createRun(PASSAGE);
    timer.reset();
    screen = "play";
    onScreenChange("play");
    renderPlay(root, state, timer.elapsedMs());
    animationFrame = requestAnimationFrame(tick);
  }

  startRun();

  return {
    handleKey(event) {
      if (screen !== "play") return;
      const motion = motionFor(event);
      if (motion) handleMove(motion);
    },
    hasStarted() {
      return state.status !== "idle";
    },
    save() {
      if (screen === "results") saveBestTimeIfBetter(DRILL, finalTimeMs);
    },
    destroy() {
      cancelAnimationFrame(animationFrame);
    },
  };
}

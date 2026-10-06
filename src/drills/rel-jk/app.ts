import { createRun, press, type Passage, type RunState } from "./engine";
import { keyFor } from "./input";
import { Timer } from "../shared/timer";
import { getBestTime, isNewBest as wouldBeNewBest, saveBestTimeIfBetter } from "../shared/storage";
import { PASSAGES } from "./passages";
import { renderPlay, renderElapsed, renderResults } from "./renderer";
import type { DrillScreen, DrillSession } from "../registry";

const DRILL = "rel-jk";

/** A passage picked at random, which a run keeps from start to finish. */
function pickPassage(): Passage {
  return PASSAGES[Math.floor(Math.random() * PASSAGES.length)]!.lines;
}

export function mountRelJkDrill(
  root: HTMLElement,
  onScreenChange: (screen: DrillScreen) => void,
): DrillSession {
  // Set by startRun, which runs before the session is handed back.
  let state: RunState;
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

  function update(next: RunState): void {
    if (next === state) return;
    state = next;
    // The clock starts on the first jump, not the first digit of its count.
    if (state.status !== "idle") timer.start();
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
    state = createRun(pickPassage());
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
      const key = keyFor(event);
      if (key) update(press(state, key));
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

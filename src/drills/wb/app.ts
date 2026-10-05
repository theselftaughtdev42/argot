import { createRun, move, type Motion, type Passage, type RunState } from "./engine";
import { motionFor } from "./input";
import { Timer } from "../shared/timer";
import { getBestTime, isNewBest as wouldBeNewBest, saveBestTimeIfBetter } from "../shared/storage";
import { PASSAGES } from "./passages";
import { renderPlay, renderElapsed, renderResults } from "./renderer";
import type { DrillScreen, DrillSession } from "../registry";

const DRILL = "wb";

/** A passage picked at random, which a run keeps from start to finish. */
function pickPassage(): Passage {
  return PASSAGES[Math.floor(Math.random() * PASSAGES.length)]!.lines;
}

export function mountWbDrill(
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

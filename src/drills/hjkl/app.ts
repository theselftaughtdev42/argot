import { createRun, move, type Direction, type RunState } from "./engine";
import { directionFor } from "./input";
import { Timer } from "./timer";
import { getBestTime, isNewBest as wouldBeNewBest, saveBestTimeIfBetter } from "./storage";
import { renderPlay, renderElapsed, renderResults } from "./renderer";
import type { DrillScreen, DrillSession } from "../registry";

export function mountHjklDrill(
  root: HTMLElement,
  onScreenChange: (screen: DrillScreen) => void,
): DrillSession {
  let state: RunState = createRun();
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

  function handleMove(direction: Direction): void {
    timer.start();
    state = move(state, direction);
    if (state.status === "complete") {
      timer.stop();
      cancelAnimationFrame(animationFrame);
      finalTimeMs = timer.elapsedMs();
      isNewBest = wouldBeNewBest(finalTimeMs);
      screen = "results";
      onScreenChange("results");
      renderResults(root, finalTimeMs, isNewBest, getBestTime());
    } else {
      renderPlay(root, state, timer.elapsedMs());
    }
  }

  function startRun(): void {
    state = createRun();
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
      const direction = directionFor(event);
      if (direction) handleMove(direction);
    },
    hasStarted() {
      return state.status !== "idle";
    },
    save() {
      if (screen === "results") saveBestTimeIfBetter(finalTimeMs);
    },
    destroy() {
      cancelAnimationFrame(animationFrame);
    },
  };
}

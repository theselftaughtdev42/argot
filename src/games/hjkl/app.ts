import { createGame, move, type Direction, type GameState } from "./engine";
import { directionFor } from "./input";
import { Timer } from "./timer";
import { getBestTime, isNewBest as wouldBeNewBest, saveBestTimeIfBetter } from "./storage";
import { renderInstructions, renderPlay, renderElapsed, renderResults } from "./renderer";
import type { GameScreen, GameSession } from "../registry";

export function mountHjklGame(
  root: HTMLElement,
  onScreenChange: (screen: GameScreen) => void,
): GameSession {
  let state: GameState = createGame();
  let screen: GameScreen = "instructions";
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
    state = createGame();
    timer.reset();
    screen = "play";
    onScreenChange("play");
    renderPlay(root, state, timer.elapsedMs());
    animationFrame = requestAnimationFrame(tick);
  }

  function showInstructions(): void {
    screen = "instructions";
    onScreenChange("instructions");
    renderInstructions(root);
  }

  showInstructions();

  return {
    handleKey(event) {
      if (screen === "instructions" && event.key === "Enter" && !event.repeat) {
        startRun();
      } else if (screen === "play") {
        const direction = directionFor(event);
        if (direction) handleMove(direction);
      }
    },
    save() {
      if (screen === "results") saveBestTimeIfBetter(finalTimeMs);
    },
    destroy() {
      cancelAnimationFrame(animationFrame);
    },
  };
}

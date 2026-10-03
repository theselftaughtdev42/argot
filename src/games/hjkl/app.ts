import { createGame, move, type Direction, type GameState } from "./engine";
import { directionFor } from "./input";
import { Timer } from "./timer";
import { getBestTime, isNewBest as wouldBeNewBest, saveBestTimeIfBetter } from "./storage";
import { renderLanding, renderDrill, renderResults } from "./renderer";
import type { GameScreen, GameSession } from "../registry";

type Screen = "landing" | "drill" | "results";

export function mountHjklGame(
  root: HTMLElement,
  onScreenChange: (screen: GameScreen) => void,
): GameSession {
  let state: GameState = createGame();
  let screen: Screen = "landing";
  let finalTimeMs = 0;
  let isNewBest = false;
  let animationFrame = 0;
  const timer = new Timer();

  function tick(): void {
    if (screen !== "drill") return;
    renderDrill(root, state, timer.elapsedMs());
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
    }
  }

  function startDrill(): void {
    state = createGame();
    timer.reset();
    screen = "drill";
    onScreenChange("play");
    renderDrill(root, state, timer.elapsedMs());
    animationFrame = requestAnimationFrame(tick);
  }

  function showLanding(): void {
    screen = "landing";
    onScreenChange("splash");
    renderLanding(root, getBestTime());
  }

  showLanding();

  return {
    handleKey(event) {
      if (screen === "landing" && event.key === "Enter" && !event.repeat) {
        startDrill();
      } else if (screen === "drill") {
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

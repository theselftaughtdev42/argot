import { createGame, move, type Direction, type GameState } from "./engine";
import { createInputHandler } from "./input";
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
  let removeInputHandler: (() => void) | null = null;
  let animationFrame = 0;
  let keysEnabled = true;
  const timer = new Timer();

  function teardownInput(): void {
    removeInputHandler?.();
    removeInputHandler = null;
  }

  function tick(): void {
    if (screen !== "drill") return;
    renderDrill(root, state, timer.elapsedMs());
    animationFrame = requestAnimationFrame(tick);
  }

  function handleMove(direction: Direction): void {
    if (screen !== "drill" || !keysEnabled) return;
    timer.start();
    state = move(state, direction);
    if (state.status === "complete") {
      timer.stop();
      cancelAnimationFrame(animationFrame);
      teardownInput();
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
    teardownInput();
    removeInputHandler = createInputHandler(handleMove);
    renderDrill(root, state, timer.elapsedMs());
    animationFrame = requestAnimationFrame(tick);
  }

  function handleLandingKeydown(event: KeyboardEvent): void {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key !== "Enter" || !keysEnabled) return;
    window.removeEventListener("keydown", handleLandingKeydown);
    startDrill();
  }

  function showLanding(): void {
    screen = "landing";
    onScreenChange("splash");
    renderLanding(root, getBestTime());
    window.addEventListener("keydown", handleLandingKeydown);
  }

  showLanding();

  return {
    setKeysEnabled(enabled) {
      keysEnabled = enabled;
    },
    save() {
      if (screen === "results") saveBestTimeIfBetter(finalTimeMs);
    },
    destroy() {
      cancelAnimationFrame(animationFrame);
      teardownInput();
      window.removeEventListener("keydown", handleLandingKeydown);
    },
  };
}

import { createGame, move, type Direction, type GameState } from "./engine";
import { createInputHandler } from "./input";
import { Timer } from "./timer";
import { getBestTime, saveBestTimeIfBetter } from "./storage";
import { renderLanding, renderDrill, renderResults } from "./renderer";

type Screen = "landing" | "drill" | "results";

export function mountHjklGame(root: HTMLElement): void {
  let state: GameState = createGame();
  let screen: Screen = "landing";
  let finalTimeMs = 0;
  let isNewBest = false;
  let removeInputHandler: (() => void) | null = null;
  let animationFrame = 0;
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
    if (screen !== "drill") return;
    timer.start();
    state = move(state, direction);
    if (state.status === "complete") {
      timer.stop();
      cancelAnimationFrame(animationFrame);
      teardownInput();
      finalTimeMs = timer.elapsedMs();
      isNewBest = saveBestTimeIfBetter(finalTimeMs);
      screen = "results";
      renderResults(root, finalTimeMs, isNewBest, startDrill);
    }
  }

  function startDrill(): void {
    state = createGame();
    timer.reset();
    screen = "drill";
    teardownInput();
    removeInputHandler = createInputHandler(handleMove);
    renderDrill(root, state, timer.elapsedMs());
    animationFrame = requestAnimationFrame(tick);
  }

  function handleLandingKeydown(event: KeyboardEvent): void {
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key !== "Enter") return;
    window.removeEventListener("keydown", handleLandingKeydown);
    startDrill();
  }

  function showLanding(): void {
    screen = "landing";
    renderLanding(root, getBestTime());
    window.addEventListener("keydown", handleLandingKeydown);
  }

  showLanding();
}

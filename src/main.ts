import "./style.css";
import { mountHjklGame } from "./games/hjkl/app";

const root = document.querySelector<HTMLDivElement>("#app");
if (root) {
  mountHjklGame(root);
}

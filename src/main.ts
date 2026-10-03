import { initTheme } from "./theme";
import { mountApp } from "./app";

initTheme();

const root = document.querySelector<HTMLDivElement>("#app");
if (root) {
  mountApp(root);
}

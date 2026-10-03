import { mountHjklGame } from "./hjkl/app";

export type MountGame = (root: HTMLElement) => void;

/** Every game the shell can list with `ls` and launch with `vim <name>`. */
export const games = new Map<string, MountGame>([["hjkl", mountHjklGame]]);

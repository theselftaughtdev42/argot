/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Dev-only override for how many targets an hjkl drill takes. */
  readonly VITE_HJKL_TARGETS?: string;
}

/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Dev-only override for how many hits an hjkl run takes. */
  readonly VITE_HJKL_HITS?: string;
}

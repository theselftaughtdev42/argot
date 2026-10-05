/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Dev-only override for how many hits a run of any drill takes. */
  readonly VITE_DRILL_HITS?: string;
}

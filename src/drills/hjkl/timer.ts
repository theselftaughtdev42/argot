/** Stays at zero until started; reports elapsed time to the millisecond. */
export class Timer {
  private startTime: number | null = null;
  private endTime: number | null = null;

  start(): void {
    if (this.startTime === null) {
      this.startTime = performance.now();
    }
  }

  stop(): void {
    if (this.startTime !== null && this.endTime === null) {
      this.endTime = performance.now();
    }
  }

  reset(): void {
    this.startTime = null;
    this.endTime = null;
  }

  elapsedMs(): number {
    if (this.startTime === null) return 0;
    const end = this.endTime ?? performance.now();
    return end - this.startTime;
  }
}

export function formatTime(ms: number): string {
  return `${(ms / 1000).toFixed(2)}s`;
}

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Timer, formatTime } from "./timer";

let now = 0;

beforeEach(() => {
  now = 1000;
  vi.spyOn(performance, "now").mockImplementation(() => now);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("Timer", () => {
  it("stays at zero until started", () => {
    const timer = new Timer();
    now += 5000;
    expect(timer.elapsedMs()).toBe(0);
  });

  it("reports live elapsed time once started", () => {
    const timer = new Timer();
    timer.start();
    now += 1234;
    expect(timer.elapsedMs()).toBe(1234);
    now += 100;
    expect(timer.elapsedMs()).toBe(1334);
  });

  it("keeps the original start time when start is called on later moves", () => {
    const timer = new Timer();
    timer.start();
    now += 500;
    timer.start();
    now += 500;
    expect(timer.elapsedMs()).toBe(1000);
  });

  it("freezes elapsed time once stopped", () => {
    const timer = new Timer();
    timer.start();
    now += 14320;
    timer.stop();
    now += 9999;
    expect(timer.elapsedMs()).toBe(14320);
  });

  it("returns to zero on reset, ready for a fresh drill", () => {
    const timer = new Timer();
    timer.start();
    now += 2000;
    timer.stop();
    timer.reset();
    now += 3000;
    expect(timer.elapsedMs()).toBe(0);
    timer.start();
    now += 250;
    expect(timer.elapsedMs()).toBe(250);
  });
});

describe("formatTime", () => {
  it("shows seconds to hundredths", () => {
    expect(formatTime(14320)).toBe("14.32s");
    expect(formatTime(0)).toBe("0.00s");
    expect(formatTime(5)).toBe("0.01s");
  });
});

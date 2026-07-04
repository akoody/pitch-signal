import { describe, expect, it } from "vitest";
import { mean, median, standardDeviation, wilsonLowerBound } from "./statistics.js";

describe("statistics", () => {
  it("computes descriptive statistics without mutating the input", () => {
    const values = [7, 3, 5, 9];
    expect(mean(values)).toBe(6);
    expect(median(values)).toBe(6);
    expect(standardDeviation(values)).toBeCloseTo(2.236, 3);
    expect(values).toEqual([7, 3, 5, 9]);
  });

  it("returns a conservative Wilson lower bound", () => {
    expect(wilsonLowerBound(9, 10)).toBeGreaterThan(0.65);
    expect(wilsonLowerBound(9, 10)).toBeLessThan(0.9);
    expect(wilsonLowerBound(0, 0)).toBe(0);
  });
});

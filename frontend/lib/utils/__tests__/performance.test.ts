import { describe, expect, it, vi, afterEach } from "vitest";
import { measure } from "@/lib/utils/performance";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("performance utils", () => {
  it("measure(): returns duration from mark startTime and clears marks", () => {
    const clearMarks = vi.fn();
    const perfMeasure = vi.fn();

    vi.stubGlobal("performance", {
      measure: perfMeasure,
      clearMarks,
      getEntriesByName: (name: string, entryType?: string) => {
        if (entryType !== "mark") return [];
        if (name === "op-start") return [{ startTime: 10 }];
        if (name === "op-end") return [{ startTime: 60 }];
        return [];
      },
    });

    expect(measure("op", "op-start", "op-end")).toBe(50);
    expect(perfMeasure).not.toHaveBeenCalled();
    expect(clearMarks).toHaveBeenCalledWith("op-start");
    expect(clearMarks).toHaveBeenCalledWith("op-end");
  });

  it("measure(): returns null for negative duration and still clears marks", () => {
    const clearMarks = vi.fn();

    vi.stubGlobal("performance", {
      measure: vi.fn(),
      clearMarks,
      getEntriesByName: (name: string, entryType?: string) => {
        if (entryType !== "mark") return [];
        if (name === "op-start") return [{ startTime: 100 }];
        if (name === "op-end") return [{ startTime: 50 }];
        return [];
      },
    });

    expect(measure("op", "op-start", "op-end")).toBeNull();
    expect(clearMarks).toHaveBeenCalledWith("op-start");
    expect(clearMarks).toHaveBeenCalledWith("op-end");
  });

  it("measure(): returns null when marks are missing", () => {
    vi.stubGlobal("performance", {
      measure: vi.fn(),
      clearMarks: vi.fn(),
      getEntriesByName: () => [],
    });

    expect(measure("op", "op-start", "op-end")).toBeNull();
  });
});


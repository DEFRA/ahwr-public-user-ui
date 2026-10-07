import { isWithinTenMonthExemption } from "./timing-rules-exemption.js";
import { config } from "../config/index.js";

describe("isWithinTenMonthExemption", () => {
  const setWindow = (start, end = null) => {
    config.set("tenMonthExemption.start", start);
    config.set("tenMonthExemption.end", end);
  };

  afterEach(() => {
    config.set("tenMonthExemption.start", null);
    config.set("tenMonthExemption.end", null);
  });

  it("is false when no start date is set", () => {
    expect(isWithinTenMonthExemption(new Date(2024, 5, 15))).toBe(false);
  });

  it("is false when no start date is set, even with an end date", () => {
    setWindow(null, "2024-06-30");

    expect(isWithinTenMonthExemption(new Date(2024, 5, 15))).toBe(false);
  });

  it.each([
    ["is false the day before the start", new Date(2024, 4, 31), false],
    ["is true on the start day", new Date(2024, 5, 1), true],
    ["is true inside the window", new Date(2024, 5, 15), true],
    ["is true on the end day", new Date(2024, 5, 30), true],
    ["is false the day after the end", new Date(2024, 6, 1), false],
  ])("%s", (_name, dateOfVisit, expected) => {
    setWindow("2024-06-01", "2024-06-30");

    expect(isWithinTenMonthExemption(dateOfVisit)).toBe(expected);
  });

  it("has no end when only the start is set", () => {
    setWindow("2024-06-01");

    expect(isWithinTenMonthExemption(new Date(2034, 0, 1))).toBe(true);
  });

  it("treats an empty end date as no end", () => {
    setWindow("2024-06-01", "");

    expect(isWithinTenMonthExemption(new Date(2034, 0, 1))).toBe(true);
  });

  it("ignores the time of day on the end day", () => {
    setWindow("2024-06-01", "2024-06-30");

    expect(isWithinTenMonthExemption(new Date(2024, 5, 30, 23, 59))).toBe(true);
  });

  it("is false without a visit date", () => {
    setWindow("2024-06-01", "2024-06-30");

    expect(isWithinTenMonthExemption(undefined)).toBe(false);
  });
});

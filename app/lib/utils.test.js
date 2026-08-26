import { addCalendarMonths, areDatesWithin10Months, isLessThan10MonthsApart } from "./utils.js";

const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

describe("addCalendarMonths", () => {
  it("adds whole calendar months for a mid-month date", () => {
    expect(iso(addCalendarMonths("2025-01-01", 10))).toBe("2025-11-01");
  });

  it("clamps to the last day of a shorter target month (31 Jan + 10m => 30 Nov)", () => {
    expect(iso(addCalendarMonths("2025-01-31", 10))).toBe("2025-11-30");
  });

  it("clamps into February (30 Apr + 10m => 28 Feb)", () => {
    expect(iso(addCalendarMonths("2025-04-30", 10))).toBe("2026-02-28");
  });
});

describe("isLessThan10MonthsApart", () => {
  it("is false when the dates are exactly 10 calendar months apart", () => {
    expect(isLessThan10MonthsApart("2025-11-01", "2025-01-01")).toBe(false);
  });

  it("is true when one day under 10 months apart", () => {
    expect(isLessThan10MonthsApart("2025-10-31", "2025-01-01")).toBe(true);
  });

  it("is false when one day over 10 months apart", () => {
    expect(isLessThan10MonthsApart("2025-11-02", "2025-01-01")).toBe(false);
  });

  it("respects end-of-month clamping (31 Jan -> 30 Nov boundary)", () => {
    expect(isLessThan10MonthsApart("2025-11-30", "2025-01-31")).toBe(false);
    expect(isLessThan10MonthsApart("2025-11-29", "2025-01-31")).toBe(true);
  });

  it("does not depend on argument order", () => {
    expect(isLessThan10MonthsApart("2025-01-01", "2025-10-31")).toBe(true);
  });
});

describe("areDatesWithin10Months", () => {
  it("is true at exactly 10 calendar months apart", () => {
    expect(areDatesWithin10Months("2025-11-01", "2025-01-01")).toBe(true);
  });

  it("is false when one day over 10 months apart", () => {
    expect(areDatesWithin10Months("2025-11-02", "2025-01-01")).toBe(false);
  });

  it("respects end-of-month clamping (30 Apr -> 28 Feb boundary)", () => {
    expect(areDatesWithin10Months("2026-02-28", "2025-04-30")).toBe(true);
    expect(areDatesWithin10Months("2026-03-01", "2025-04-30")).toBe(false);
  });
});

import { isValidDate, validateDateParts } from "./date-validations.js";

describe("isValidDate", () => {
  it("returns true for a valid date", () => {
    expect(isValidDate(2023, 9, 21)).toBe(true);
  });

  it("returns false for an invalid date", () => {
    expect(isValidDate(2023, 2, 31)).toBe(false);
  });

  it("handles leap years correctly", () => {
    expect(isValidDate(2024, 2, 29)).toBe(true);
    expect(isValidDate(2023, 2, 29)).toBe(false);
  });

  it("returns false for day overflow causing month change", () => {
    expect(isValidDate(2023, 4, 31)).toBe(false);
  });

  it("returns true for valid edge cases", () => {
    expect(isValidDate(2023, 1, 1)).toBe(true);
    expect(isValidDate(2023, 12, 31)).toBe(true);
  });

  it("handles century leap year rules", () => {
    expect(isValidDate(2000, 2, 29)).toBe(true);
    expect(isValidDate(1900, 2, 29)).toBe(false);
  });
});

describe("validateDateParts", () => {
  it("returns null when the date is complete and real", () => {
    expect(validateDateParts({ day: "15", month: "5", year: "2023" })).toBeNull();
  });

  describe("completeness", () => {
    it("flags every field when nothing is entered", () => {
      expect(validateDateParts({ day: "", month: "", year: "" })).toEqual({
        reason: "incomplete",
        missing: ["day", "month", "year"],
        inputsInError: { day: true, month: true, year: true },
      });
    });

    it("flags day and year when only the month is entered", () => {
      expect(validateDateParts({ day: "", month: "5", year: "" })).toEqual({
        reason: "incomplete",
        missing: ["day", "year"],
        inputsInError: { day: true, month: false, year: true },
      });
    });

    it("flags day and month when only the year is entered", () => {
      expect(validateDateParts({ day: "", month: "", year: "2023" })).toEqual({
        reason: "incomplete",
        missing: ["day", "month"],
        inputsInError: { day: true, month: true, year: false },
      });
    });

    it("flags month and year when only the day is entered", () => {
      expect(validateDateParts({ day: "15", month: "", year: "" })).toEqual({
        reason: "incomplete",
        missing: ["month", "year"],
        inputsInError: { day: false, month: true, year: true },
      });
    });

    it("flags only the missing day", () => {
      expect(validateDateParts({ day: "", month: "5", year: "2023" })).toEqual({
        reason: "incomplete",
        missing: ["day"],
        inputsInError: { day: true, month: false, year: false },
      });
    });

    it("flags only the missing month", () => {
      expect(validateDateParts({ day: "15", month: "", year: "2023" })).toEqual({
        reason: "incomplete",
        missing: ["month"],
        inputsInError: { day: false, month: true, year: false },
      });
    });

    it("flags only the missing year", () => {
      expect(validateDateParts({ day: "15", month: "5", year: "" })).toEqual({
        reason: "incomplete",
        missing: ["year"],
        inputsInError: { day: false, month: false, year: true },
      });
    });
  });

  describe("year range", () => {
    it("flags the year when it is below 1000", () => {
      expect(validateDateParts({ day: "15", month: "5", year: "999" })).toEqual({
        reason: "year",
        missing: [],
        inputsInError: { day: false, month: false, year: true },
      });
    });

    it("flags the year when it is above 9999", () => {
      expect(validateDateParts({ day: "15", month: "5", year: "10000" })).toEqual({
        reason: "year",
        missing: [],
        inputsInError: { day: false, month: false, year: true },
      });
    });

    it("accepts the minimum year", () => {
      expect(validateDateParts({ day: "15", month: "5", year: "1000" })).toBeNull();
    });

    it("accepts the maximum year", () => {
      expect(validateDateParts({ day: "15", month: "5", year: "9999" })).toBeNull();
    });
  });

  describe("real date", () => {
    it("flags an impossible day for the month", () => {
      expect(validateDateParts({ day: "31", month: "2", year: "2023" })).toEqual({
        reason: "realDate",
        missing: [],
        inputsInError: { day: true, month: true, year: true },
      });
    });

    it("rejects 29 February in a non-leap year", () => {
      expect(validateDateParts({ day: "29", month: "2", year: "2023" })).toEqual({
        reason: "realDate",
        missing: [],
        inputsInError: { day: true, month: true, year: true },
      });
    });

    it("accepts 29 February in a leap year", () => {
      expect(validateDateParts({ day: "29", month: "2", year: "2024" })).toBeNull();
    });

    it("rejects a non-numeric day", () => {
      expect(validateDateParts({ day: "abc", month: "5", year: "2023" })).toEqual({
        reason: "realDate",
        missing: [],
        inputsInError: { day: true, month: true, year: true },
      });
    });

    it("rejects a month greater than 12", () => {
      expect(validateDateParts({ day: "15", month: "13", year: "2023" })).toEqual({
        reason: "realDate",
        missing: [],
        inputsInError: { day: true, month: true, year: true },
      });
    });
  });
});

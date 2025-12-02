import { isValidDate } from "../../../../app/lib/date-validations";

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
});

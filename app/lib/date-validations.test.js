import Joi from "joi";
import {
  isValidDate,
  validateDateInputDay,
  validateDateInputMonth,
  validateDateInputYear,
} from "./date-validations.js";

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

describe("validateDateInputDay", () => {
  const namePrefix = "test-date";
  const dateName = "Test date";

  const createSchema = () =>
    Joi.object({
      [`${namePrefix}-day`]: Joi.string().allow(""),
      [`${namePrefix}-month`]: Joi.string().allow(""),
      [`${namePrefix}-year`]: Joi.string().allow(""),
      dayValidation: validateDateInputDay(namePrefix, dateName),
    });

  describe("when day is empty", () => {
    it("returns error when all fields are empty", () => {
      const schema = createSchema();
      const result = schema.validate({
        [`${namePrefix}-day`]: "",
        [`${namePrefix}-month`]: "",
        [`${namePrefix}-year`]: "",
        dayValidation: "",
      });

      expect(result.error).toBeDefined();
      expect(result.error.details[0].type).toBe("dateInputDay.ifNothingIsEntered");
    });

    it("returns error when day and year are empty but month is provided", () => {
      const schema = createSchema();
      const result = schema.validate({
        [`${namePrefix}-day`]: "",
        [`${namePrefix}-month`]: "5",
        [`${namePrefix}-year`]: "",
        dayValidation: "",
      });

      expect(result.error).toBeDefined();
      expect(result.error.details[0].type).toBe("dateInputDay.ifTheDateIsIncomplete.dayAndYear");
    });

    it("returns error when day and month are empty but year is provided", () => {
      const schema = createSchema();
      const result = schema.validate({
        [`${namePrefix}-day`]: "",
        [`${namePrefix}-month`]: "",
        [`${namePrefix}-year`]: "2023",
        dayValidation: "",
      });

      expect(result.error).toBeDefined();
      expect(result.error.details[0].type).toBe("dateInputDay.ifTheDateIsIncomplete.dayAndMonth");
    });

    it("returns error when only day is empty", () => {
      const schema = createSchema();
      const result = schema.validate({
        [`${namePrefix}-day`]: "",
        [`${namePrefix}-month`]: "5",
        [`${namePrefix}-year`]: "2023",
        dayValidation: "",
      });

      expect(result.error).toBeDefined();
      expect(result.error.details[0].type).toBe("dateInputDay.ifTheDateIsIncomplete.day");
    });
  });

  describe("when day is provided", () => {
    it("validates a valid day", () => {
      const schema = createSchema();
      const result = schema.validate({
        [`${namePrefix}-day`]: "15",
        [`${namePrefix}-month`]: "5",
        [`${namePrefix}-year`]: "2023",
        dayValidation: "15",
      });

      expect(result.error).toBeUndefined();
    });

    it("rejects day less than 1", () => {
      const schema = createSchema();
      const result = schema.validate({
        [`${namePrefix}-day`]: "0",
        [`${namePrefix}-month`]: "5",
        [`${namePrefix}-year`]: "2023",
        dayValidation: "0",
      });

      expect(result.error).toBeDefined();
      expect(result.error.details[0].message).toContain("must be a real date");
    });

    it("rejects day greater than 31", () => {
      const schema = createSchema();
      const result = schema.validate({
        [`${namePrefix}-day`]: "32",
        [`${namePrefix}-month`]: "5",
        [`${namePrefix}-year`]: "2023",
        dayValidation: "32",
      });

      expect(result.error).toBeDefined();
      expect(result.error.details[0].message).toContain("must be a real date");
    });

    it("rejects non-numeric day", () => {
      const schema = createSchema();
      const result = schema.validate({
        [`${namePrefix}-day`]: "abc",
        [`${namePrefix}-month`]: "5",
        [`${namePrefix}-year`]: "2023",
        dayValidation: "abc",
      });

      expect(result.error).toBeDefined();
      expect(result.error.details[0].message).toContain("must be a real date");
    });
  });

  describe("February validation", () => {
    it("allows 28 days in February for non-leap year", () => {
      const schema = createSchema();
      const result = schema.validate({
        [`${namePrefix}-day`]: "28",
        [`${namePrefix}-month`]: "2",
        [`${namePrefix}-year`]: "2023",
        dayValidation: "28",
      });

      expect(result.error).toBeUndefined();
    });

    it("rejects 29 days in February for non-leap year", () => {
      const schema = createSchema();
      const result = schema.validate({
        [`${namePrefix}-day`]: "29",
        [`${namePrefix}-month`]: "2",
        [`${namePrefix}-year`]: "2023",
        dayValidation: "29",
      });

      expect(result.error).toBeDefined();
      expect(result.error.details[0].message).toContain("must be a real date");
    });

    it("allows 29 days in February for leap year", () => {
      const schema = createSchema();
      const result = schema.validate({
        [`${namePrefix}-day`]: "29",
        [`${namePrefix}-month`]: "2",
        [`${namePrefix}-year`]: "2024",
        dayValidation: "29",
      });

      expect(result.error).toBeUndefined();
    });

    it("rejects 30 days in February for leap year", () => {
      const schema = createSchema();
      const result = schema.validate({
        [`${namePrefix}-day`]: "30",
        [`${namePrefix}-month`]: "2",
        [`${namePrefix}-year`]: "2024",
        dayValidation: "30",
      });

      expect(result.error).toBeDefined();
      expect(result.error.details[0].message).toContain("must be a real date");
    });

    it("handles century leap year (divisible by 400)", () => {
      const schema = createSchema();
      const result = schema.validate({
        [`${namePrefix}-day`]: "29",
        [`${namePrefix}-month`]: "2",
        [`${namePrefix}-year`]: "2000",
        dayValidation: "29",
      });

      expect(result.error).toBeUndefined();
    });

    it("rejects 29 Feb for century non-leap year", () => {
      const schema = createSchema();
      const result = schema.validate({
        [`${namePrefix}-day`]: "29",
        [`${namePrefix}-month`]: "2",
        [`${namePrefix}-year`]: "1900",
        dayValidation: "29",
      });

      expect(result.error).toBeDefined();
    });
  });

  describe("short months validation (30 days)", () => {
    const shortMonths = [4, 6, 9, 11];

    shortMonths.forEach((month) => {
      it(`allows 30 days in month ${month}`, () => {
        const schema = createSchema();
        const result = schema.validate({
          [`${namePrefix}-day`]: "30",
          [`${namePrefix}-month`]: String(month),
          [`${namePrefix}-year`]: "2023",
          dayValidation: "30",
        });

        expect(result.error).toBeUndefined();
      });

      it(`rejects 31 days in month ${month}`, () => {
        const schema = createSchema();
        const result = schema.validate({
          [`${namePrefix}-day`]: "31",
          [`${namePrefix}-month`]: String(month),
          [`${namePrefix}-year`]: "2023",
          dayValidation: "31",
        });

        expect(result.error).toBeDefined();
        expect(result.error.details[0].message).toContain("must be a real date");
      });
    });
  });

  describe("long months validation (31 days)", () => {
    const longMonths = [1, 3, 5, 7, 8, 10, 12];

    longMonths.forEach((month) => {
      it(`allows 31 days in month ${month}`, () => {
        const schema = createSchema();
        const result = schema.validate({
          [`${namePrefix}-day`]: "31",
          [`${namePrefix}-month`]: String(month),
          [`${namePrefix}-year`]: "2023",
          dayValidation: "31",
        });

        expect(result.error).toBeUndefined();
      });
    });
  });
});

describe("validateDateInputMonth", () => {
  const namePrefix = "test-date";
  const dateName = "Test date";

  const createSchema = () =>
    Joi.object({
      [`${namePrefix}-day`]: Joi.string().allow(""),
      [`${namePrefix}-month`]: Joi.string().allow(""),
      [`${namePrefix}-year`]: Joi.string().allow(""),
      monthValidation: validateDateInputMonth(namePrefix, dateName),
    });

  describe("when month is empty", () => {
    it("returns error when all fields are empty", () => {
      const schema = createSchema();
      const result = schema.validate({
        [`${namePrefix}-day`]: "",
        [`${namePrefix}-month`]: "",
        [`${namePrefix}-year`]: "",
        monthValidation: "",
      });

      expect(result.error).toBeDefined();
      expect(result.error.details[0].type).toBe("dateInputMonth.ifNothingIsEntered");
    });

    it("returns error when day and month are empty but year is provided", () => {
      const schema = createSchema();
      const result = schema.validate({
        [`${namePrefix}-day`]: "",
        [`${namePrefix}-month`]: "",
        [`${namePrefix}-year`]: "2023",
        monthValidation: "",
      });

      expect(result.error).toBeDefined();
      expect(result.error.details[0].type).toBe("dateInputMonth.ifTheDateIsIncomplete.dayAndMonth");
    });

    it("returns error when month and year are empty but day is provided", () => {
      const schema = createSchema();
      const result = schema.validate({
        [`${namePrefix}-day`]: "15",
        [`${namePrefix}-month`]: "",
        [`${namePrefix}-year`]: "",
        monthValidation: "",
      });

      expect(result.error).toBeDefined();
      expect(result.error.details[0].type).toBe(
        "dateInputMonth.ifTheDateIsIncomplete.monthAndYear",
      );
    });

    it("returns error when only month is empty", () => {
      const schema = createSchema();
      const result = schema.validate({
        [`${namePrefix}-day`]: "15",
        [`${namePrefix}-month`]: "",
        [`${namePrefix}-year`]: "2023",
        monthValidation: "",
      });

      expect(result.error).toBeDefined();
      expect(result.error.details[0].type).toBe("dateInputMonth.ifTheDateIsIncomplete.month");
    });
  });

  describe("when month is provided", () => {
    it("validates a valid month", () => {
      const schema = createSchema();
      const result = schema.validate({
        [`${namePrefix}-day`]: "15",
        [`${namePrefix}-month`]: "5",
        [`${namePrefix}-year`]: "2023",
        monthValidation: "5",
      });

      expect(result.error).toBeUndefined();
    });

    it("validates month 1 (January)", () => {
      const schema = createSchema();
      const result = schema.validate({
        [`${namePrefix}-day`]: "15",
        [`${namePrefix}-month`]: "1",
        [`${namePrefix}-year`]: "2023",
        monthValidation: "1",
      });

      expect(result.error).toBeUndefined();
    });

    it("validates month 12 (December)", () => {
      const schema = createSchema();
      const result = schema.validate({
        [`${namePrefix}-day`]: "15",
        [`${namePrefix}-month`]: "12",
        [`${namePrefix}-year`]: "2023",
        monthValidation: "12",
      });

      expect(result.error).toBeUndefined();
    });

    it("rejects month less than 1", () => {
      const schema = createSchema();
      const result = schema.validate({
        [`${namePrefix}-day`]: "15",
        [`${namePrefix}-month`]: "0",
        [`${namePrefix}-year`]: "2023",
        monthValidation: "0",
      });

      expect(result.error).toBeDefined();
      expect(result.error.details[0].message).toContain("must be a real date");
    });

    it("rejects month greater than 12", () => {
      const schema = createSchema();
      const result = schema.validate({
        [`${namePrefix}-day`]: "15",
        [`${namePrefix}-month`]: "13",
        [`${namePrefix}-year`]: "2023",
        monthValidation: "13",
      });

      expect(result.error).toBeDefined();
      expect(result.error.details[0].message).toContain("must be a real date");
    });

    it("rejects non-numeric month", () => {
      const schema = createSchema();
      const result = schema.validate({
        [`${namePrefix}-day`]: "15",
        [`${namePrefix}-month`]: "abc",
        [`${namePrefix}-year`]: "2023",
        monthValidation: "abc",
      });

      expect(result.error).toBeDefined();
      expect(result.error.details[0].message).toContain("must be a real date");
    });
  });

  describe("error messages", () => {
    it("includes the date name in error messages", () => {
      const customDateName = "Date of visit";
      const customSchema = Joi.object({
        [`${namePrefix}-day`]: Joi.string().allow(""),
        [`${namePrefix}-month`]: Joi.string().allow(""),
        [`${namePrefix}-year`]: Joi.string().allow(""),
        monthValidation: validateDateInputMonth(namePrefix, customDateName),
      });

      const result = customSchema.validate({
        [`${namePrefix}-day`]: "15",
        [`${namePrefix}-month`]: "",
        [`${namePrefix}-year`]: "2023",
        monthValidation: "",
      });

      expect(result.error).toBeDefined();
      expect(result.error.details[0].message).toContain("Date of visit");
    });
  });
});

describe("validateDateInputYear", () => {
  const namePrefix = "test-date";
  const dateName = "Test date";

  const createSchema = (customValidation = (value) => value, customMessages = {}) =>
    Joi.object({
      [`${namePrefix}-day`]: Joi.string().allow(""),
      [`${namePrefix}-month`]: Joi.string().allow(""),
      [`${namePrefix}-year`]: Joi.string().allow(""),
      yearValidation: validateDateInputYear(namePrefix, dateName, customValidation, customMessages),
    });

  describe("when year is empty", () => {
    it("returns error when all fields are empty", () => {
      const schema = createSchema();
      const result = schema.validate({
        [`${namePrefix}-day`]: "",
        [`${namePrefix}-month`]: "",
        [`${namePrefix}-year`]: "",
        yearValidation: "",
      });

      expect(result.error).toBeDefined();
      expect(result.error.details[0].type).toBe("dateInputYear.ifNothingIsEntered");
    });

    it("returns error when day and year are empty but month is provided", () => {
      const schema = createSchema();
      const result = schema.validate({
        [`${namePrefix}-day`]: "",
        [`${namePrefix}-month`]: "5",
        [`${namePrefix}-year`]: "",
        yearValidation: "",
      });

      expect(result.error).toBeDefined();
      expect(result.error.details[0].type).toBe("dateInputYear.ifTheDateIsIncomplete.dayAndYear");
    });

    it("returns error when month and year are empty but day is provided", () => {
      const schema = createSchema();
      const result = schema.validate({
        [`${namePrefix}-day`]: "15",
        [`${namePrefix}-month`]: "",
        [`${namePrefix}-year`]: "",
        yearValidation: "",
      });

      expect(result.error).toBeDefined();
      expect(result.error.details[0].type).toBe("dateInputYear.ifTheDateIsIncomplete.monthAndYear");
    });

    it("returns error when only year is empty", () => {
      const schema = createSchema();
      const result = schema.validate({
        [`${namePrefix}-day`]: "15",
        [`${namePrefix}-month`]: "5",
        [`${namePrefix}-year`]: "",
        yearValidation: "",
      });

      expect(result.error).toBeDefined();
      expect(result.error.details[0].type).toBe("dateInputYear.ifTheDateIsIncomplete.year");
    });
  });

  describe("when year is provided", () => {
    it("validates a valid year", () => {
      const schema = createSchema();
      const result = schema.validate({
        [`${namePrefix}-day`]: "15",
        [`${namePrefix}-month`]: "5",
        [`${namePrefix}-year`]: "2023",
        yearValidation: "2023",
      });

      expect(result.error).toBeUndefined();
    });

    it("validates minimum year (1000)", () => {
      const schema = createSchema();
      const result = schema.validate({
        [`${namePrefix}-day`]: "15",
        [`${namePrefix}-month`]: "5",
        [`${namePrefix}-year`]: "1000",
        yearValidation: "1000",
      });

      expect(result.error).toBeUndefined();
    });

    it("validates maximum year (9999)", () => {
      const schema = createSchema();
      const result = schema.validate({
        [`${namePrefix}-day`]: "15",
        [`${namePrefix}-month`]: "5",
        [`${namePrefix}-year`]: "9999",
        yearValidation: "9999",
      });

      expect(result.error).toBeUndefined();
    });

    it("rejects year less than 1000", () => {
      const schema = createSchema();
      const result = schema.validate({
        [`${namePrefix}-day`]: "15",
        [`${namePrefix}-month`]: "5",
        [`${namePrefix}-year`]: "999",
        yearValidation: "999",
      });

      expect(result.error).toBeDefined();
      expect(result.error.details[0].message).toBe("Year must include 4 numbers");
    });

    it("rejects year greater than 9999", () => {
      const schema = createSchema();
      const result = schema.validate({
        [`${namePrefix}-day`]: "15",
        [`${namePrefix}-month`]: "5",
        [`${namePrefix}-year`]: "10000",
        yearValidation: "10000",
      });

      expect(result.error).toBeDefined();
      expect(result.error.details[0].message).toBe("Year must include 4 numbers");
    });

    it("rejects non-numeric year", () => {
      const schema = createSchema();
      const result = schema.validate({
        [`${namePrefix}-day`]: "15",
        [`${namePrefix}-month`]: "5",
        [`${namePrefix}-year`]: "abcd",
        yearValidation: "abcd",
      });

      expect(result.error).toBeDefined();
    });
  });

  describe("custom validation", () => {
    it("runs custom validation when day, month and year are all provided as numbers", () => {
      const customValidation = jest.fn((value) => value);
      const schema = createSchema(customValidation);

      schema.validate({
        [`${namePrefix}-day`]: "15",
        [`${namePrefix}-month`]: "5",
        [`${namePrefix}-year`]: "2023",
        yearValidation: "2023",
      });

      expect(customValidation).toHaveBeenCalled();
    });

    it("does not run custom validation when day is not a number", () => {
      const customValidation = jest.fn((value) => value);
      const schema = createSchema(customValidation);

      schema.validate({
        [`${namePrefix}-day`]: "abc",
        [`${namePrefix}-month`]: "5",
        [`${namePrefix}-year`]: "2023",
        yearValidation: "2023",
      });

      expect(customValidation).not.toHaveBeenCalled();
    });

    it("does not run custom validation when month is not a number", () => {
      const customValidation = jest.fn((value) => value);
      const schema = createSchema(customValidation);

      schema.validate({
        [`${namePrefix}-day`]: "15",
        [`${namePrefix}-month`]: "abc",
        [`${namePrefix}-year`]: "2023",
        yearValidation: "2023",
      });

      expect(customValidation).not.toHaveBeenCalled();
    });

    it("custom validation can return error", () => {
      const customValidation = (_value, helpers) => {
        return helpers.error("custom.error");
      };
      const customMessages = {
        "custom.error": "Custom error message",
      };
      const schema = createSchema(customValidation, customMessages);

      const result = schema.validate({
        [`${namePrefix}-day`]: "15",
        [`${namePrefix}-month`]: "5",
        [`${namePrefix}-year`]: "2023",
        yearValidation: "2023",
      });

      expect(result.error).toBeDefined();
      expect(result.error.details[0].message).toBe("Custom error message");
    });

    it("custom validation receives helpers with ancestors", () => {
      let receivedAncestors;
      const customValidation = (value, helpers) => {
        receivedAncestors = helpers.state.ancestors;
        return value;
      };
      const schema = createSchema(customValidation);

      schema.validate({
        [`${namePrefix}-day`]: "15",
        [`${namePrefix}-month`]: "5",
        [`${namePrefix}-year`]: "2023",
        yearValidation: "2023",
      });

      expect(receivedAncestors).toBeDefined();
      expect(receivedAncestors[0][`${namePrefix}-day`]).toBe("15");
      expect(receivedAncestors[0][`${namePrefix}-month`]).toBe("5");
      expect(receivedAncestors[0][`${namePrefix}-year`]).toBe("2023");
    });
  });

  describe("error messages", () => {
    it("includes the date name in error messages", () => {
      const customDateName = "Date of sampling";
      const customSchema = Joi.object({
        [`${namePrefix}-day`]: Joi.string().allow(""),
        [`${namePrefix}-month`]: Joi.string().allow(""),
        [`${namePrefix}-year`]: Joi.string().allow(""),
        yearValidation: validateDateInputYear(namePrefix, customDateName, (value) => value, {}),
      });

      const result = customSchema.validate({
        [`${namePrefix}-day`]: "15",
        [`${namePrefix}-month`]: "",
        [`${namePrefix}-year`]: "",
        yearValidation: "",
      });

      expect(result.error).toBeDefined();
      expect(result.error.details[0].message).toContain("Date of sampling");
    });
  });
});

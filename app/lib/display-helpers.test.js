import { formatTypesOfPoultry } from "./display-helpers.js";

describe("formatTypesOfPoultry", () => {
  it("capitalises the first letter and replaces dashes with spaces for a single type", () => {
    expect(formatTypesOfPoultry(["laying-hens"])).toEqual("Laying hens");
  });

  it("joins multiple types with a comma and capitalises only the first letter", () => {
    expect(formatTypesOfPoultry(["broilers", "laying-hens", "ducks"])).toEqual(
      "Broilers, laying hens, ducks",
    );
  });

  it("excludes the 'chickens' parent category", () => {
    expect(formatTypesOfPoultry(["chickens", "broilers", "laying-hens"])).toEqual(
      "Broilers, laying hens",
    );
  });

  it("returns undefined for an empty array", () => {
    expect(formatTypesOfPoultry([])).toBeUndefined();
  });

  it("returns undefined when given undefined", () => {
    expect(formatTypesOfPoultry(undefined)).toBeUndefined();
  });
});

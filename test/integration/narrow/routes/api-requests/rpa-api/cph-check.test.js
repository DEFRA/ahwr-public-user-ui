import { customerHasAtLeastOneValidCph } from "../../../../../../app/api-requests/rpa-api/cph-check.js";
import { config } from "../../../../../../app/config/index.js";

describe("poultry flag is down", () => {
  beforeAll(() => {
    config.poultry.enabled = false;
  });

  test("customerHasAtLeastOneValidCph returns false if the users cph is slaughterhouse", async () => {
    expect(customerHasAtLeastOneValidCph(["33/333/8888"])).toBeFalsy();
  });

  test("customerHasAtLeastOneValidCph returns false if the users cph is outside of England", async () => {
    expect(customerHasAtLeastOneValidCph(["52/333/4888"])).toBeFalsy();
  });

  test("customerHasAtLeastOneValidCph returns true if the users cph is lower livestock", async () => {
    expect(customerHasAtLeastOneValidCph(["33/333/0001"])).toBeTruthy();
  });

  test("customerHasAtLeastOneValidCph returns true if the users cph is higher livestock", async () => {
    expect(customerHasAtLeastOneValidCph(["33/333/7999"])).toBeTruthy();
  });

  test("customerHasAtLeastOneValidCph returns false if the users cph is poultry", async () => {
    expect(customerHasAtLeastOneValidCph(["33/333/9000"])).toBeFalsy();
  });

  test("customerHasAtLeastOneValidCph returns true if the user has an invalid and a valid cph", async () => {
    expect(customerHasAtLeastOneValidCph(["33/333/8888", "33/333/3333"])).toBeTruthy();
  });
});

describe("poultry flag is up", () => {
  beforeAll(() => {
    config.poultry.enabled = true;
  });

  test("customerHasAtLeastOneValidCph returns false if the users cph is slaughterhouse", async () => {
    expect(customerHasAtLeastOneValidCph(["33/333/8888"])).toBeFalsy();
  });

  test("customerHasAtLeastOneValidCph returns false if the users cph is outside of England", async () => {
    expect(customerHasAtLeastOneValidCph(["52/333/4888"])).toBeFalsy();
  });

  test("customerHasAtLeastOneValidCph returns true if the users cph is lower livestock", async () => {
    expect(customerHasAtLeastOneValidCph(["33/333/0001"])).toBeTruthy();
  });

  test("customerHasAtLeastOneValidCph returns true if the users cph is higher livestock", async () => {
    expect(customerHasAtLeastOneValidCph(["33/333/7999"])).toBeTruthy();
  });

  test("customerHasAtLeastOneValidCph returns true if the users cph is poultry", async () => {
    expect(customerHasAtLeastOneValidCph(["33/333/9000"])).toBeTruthy();
  });

  test("customerHasAtLeastOneValidCph returns true if the user has an invalid and a valid cph", async () => {
    expect(customerHasAtLeastOneValidCph(["33/333/8888", "33/333/3333"])).toBeTruthy();
  });
});

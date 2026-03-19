import { config } from "../config";
import { checkIfPoultryAgreement } from "./agreement-helper";

describe("checkIfPoultryAgreement", () => {
  test("latestEndemicsApplication is null", () => {
    const actual = checkIfPoultryAgreement(null);

    expect(actual).toBeFalsy();
  });

  test("latestEndemicsApplication is undefined", () => {
    const actual = checkIfPoultryAgreement(undefined);

    expect(actual).toBeFalsy();
  });

  test("there is no reference", () => {
    const actual = checkIfPoultryAgreement({});

    expect(actual).toBeFalsy();
  });

  test("reference is null", () => {
    const actual = checkIfPoultryAgreement({ reference: null });

    expect(actual).toBeFalsy();
  });

  test("reference is undefined", () => {
    const actual = checkIfPoultryAgreement({ reference: undefined });

    expect(actual).toBeFalsy();
  });

  test("reference starts with POUL and flag is on", () => {
    config.poultry.enabled = true;
    const actual = checkIfPoultryAgreement({ reference: "POUL-83720-38287" });

    expect(actual).toBeTruthy();
  });

  test("reference starts with POUL and flag is off", () => {
    config.poultry.enabled = false;
    const actual = checkIfPoultryAgreement({ reference: "POUL-83720-38287" });

    expect(actual).toBeFalsy();
  });

  test("reference starts with something else", () => {
    const actual = checkIfPoultryAgreement({ reference: "AHWR-83720-38287" });

    expect(actual).toBeFalsy();
  });
});

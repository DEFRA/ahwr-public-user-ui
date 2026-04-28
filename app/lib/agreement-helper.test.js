import { config } from "../config/index.js";
import { checkIfPoultryAgreement, shouldShowManageYourClaims } from "./agreement-helper.js";
import { getSessionData } from "../session/index.js";
import { dashboardRoutes } from "../constants/routes.js";

jest.mock("../session/index.js");

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

describe("shouldShowManageYourClaims", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns false when path is /check-details", () => {
    const request = { path: dashboardRoutes.checkDetails };

    const actual = shouldShowManageYourClaims(request);

    expect(actual).toBe(false);
    expect(getSessionData).not.toHaveBeenCalled();
  });

  test("returns false when path is /select-funding", () => {
    const request = { path: dashboardRoutes.selectFunding };

    const actual = shouldShowManageYourClaims(request);

    expect(actual).toBe(false);
    expect(getSessionData).not.toHaveBeenCalled();
  });

  describe("livestock urls", () => {
    test("returns false when latestEndemicsApplication is null", () => {
      getSessionData.mockReturnValue(null);
      const request = { path: "/vet-visits" };

      const actual = shouldShowManageYourClaims(request);

      expect(actual).toBe(false);
    });

    test("returns false when latestEndemicsApplication is undefined", () => {
      getSessionData.mockReturnValue(undefined);
      const request = { path: "/vet-visits" };

      const actual = shouldShowManageYourClaims(request);

      expect(actual).toBe(false);
    });

    test("returns false when latestEndemicsApplication has no status", () => {
      getSessionData.mockReturnValue({});
      const request = { path: "/vet-visits" };

      const actual = shouldShowManageYourClaims(request);

      expect(actual).toBe(false);
    });

    test("returns false when status is not AGREED", () => {
      getSessionData.mockReturnValue({ status: "PENDING" });
      const request = { path: "/vet-visits" };

      const actual = shouldShowManageYourClaims(request);

      expect(actual).toBe(false);
    });

    test("returns true when status is AGREED", () => {
      getSessionData.mockReturnValue({ status: "AGREED" });
      const request = { path: "/vet-visits" };

      const actual = shouldShowManageYourClaims(request);

      expect(actual).toBe(true);
    });

    test("returns true when status is AGREED on a claim route", () => {
      getSessionData.mockReturnValue({ status: "AGREED" });
      const request = { path: "/date-of-visit" };

      const actual = shouldShowManageYourClaims(request);

      expect(actual).toBe(true);
    });

    test("returns true when status is AGREED on apply confirmation", () => {
      getSessionData.mockReturnValue({ status: "AGREED" });
      const request = { path: "/confirmation" };

      const actual = shouldShowManageYourClaims(request);

      expect(actual).toBe(true);
    });
  });
});

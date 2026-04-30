import { when } from "jest-when";
import { config } from "../config/index.js";
import { checkIfPoultryAgreement, shouldShowManageYourClaims } from "./agreement-helper.js";
import { getSessionData, sessionEntryKeys, sessionKeys } from "../session/index.js";
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

  const mockEndemicsSessionData = (request, returnValue) => {
    when(getSessionData)
      .calledWith(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.latestEndemicsApplication,
      )
      .mockReturnValue(returnValue);
  };

  const mockPoultrySessionData = (request, returnValue) => {
    when(getSessionData)
      .calledWith(
        request,
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.latestPoultryApplication,
      )
      .mockReturnValue(returnValue);
  };

  describe("livestock urls", () => {
    test("false when latestEndemicsApplication is null", () => {
      const request = { path: "/vet-visits" };
      mockEndemicsSessionData(request, null);

      const actual = shouldShowManageYourClaims(request);

      expect(actual).toBe(false);
    });

    test("false when latestEndemicsApplication is undefined", () => {
      const request = { path: "/vet-visits" };
      mockEndemicsSessionData(request, undefined);

      const actual = shouldShowManageYourClaims(request);

      expect(actual).toBe(false);
    });

    test("false when latestEndemicsApplication has no status", () => {
      const request = { path: "/vet-visits" };
      mockEndemicsSessionData(request, {});

      const actual = shouldShowManageYourClaims(request);

      expect(actual).toBe(false);
    });

    test("false when status is not AGREED", () => {
      const request = { path: "/vet-visits" };
      mockEndemicsSessionData(request, { status: "PENDING" });

      const actual = shouldShowManageYourClaims(request);

      expect(actual).toBe(false);
    });

    test("false when status is not AGREED in endemics but agreed on poultry", () => {
      const request = { path: "/vet-visits" };
      mockEndemicsSessionData(request, { status: "PENDING" });
      mockPoultrySessionData(request, { status: "AGREED" });

      const actual = shouldShowManageYourClaims(request);

      expect(actual).toBe(false);
    });

    test("true when status is AGREED", () => {
      const request = { path: "/vet-visits" };
      mockEndemicsSessionData(request, { status: "AGREED" });

      const actual = shouldShowManageYourClaims(request);

      expect(actual).toBe(true);
    });

    test("true when status is AGREED on a claim route", () => {
      const request = { path: "/date-of-visit" };
      mockEndemicsSessionData(request, { status: "AGREED" });

      const actual = shouldShowManageYourClaims(request);

      expect(actual).toBe(true);
    });

    test("true on post declaration (confirmation)", () => {
      const request = { path: "/declaration", method: "post" };
      mockEndemicsSessionData(request, { status: "AGREED" });

      const actual = shouldShowManageYourClaims(request);

      expect(actual).toBe(true);
    });

    test("false on get declaration (before confirmation)", () => {
      const request = { path: "/declaration", method: "get" };
      mockEndemicsSessionData(request, { status: "AGREED" });

      const actual = shouldShowManageYourClaims(request);

      expect(actual).toBe(false);
    });
  });

  describe("poultry urls", () => {
    test("false when latestPoultryApplication is null", () => {
      const request = { path: "/poultry/vet-visits" };
      mockPoultrySessionData(request, null);

      const actual = shouldShowManageYourClaims(request);

      expect(actual).toBe(false);
    });

    test("false when latestEndemicsApplication is undefined", () => {
      const request = { path: "/poultry/vet-visits" };
      mockPoultrySessionData(request, undefined);

      const actual = shouldShowManageYourClaims(request);

      expect(actual).toBe(false);
    });

    test("false when latestEndemicsApplication has no status", () => {
      const request = { path: "/poultry/vet-visits" };
      mockPoultrySessionData(request, {});

      const actual = shouldShowManageYourClaims(request);

      expect(actual).toBe(false);
    });

    test("false when status is not AGREED", () => {
      const request = { path: "/poultry/vet-visits" };
      mockPoultrySessionData(request, { status: "PENDING" });

      const actual = shouldShowManageYourClaims(request);

      expect(actual).toBe(false);
    });

    test("false when status is not AGREED in poultry but agreed on endemics", () => {
      const request = { path: "/poultry/vet-visits" };
      mockPoultrySessionData(request, { status: "PENDING" });
      mockEndemicsSessionData(request, { status: "AGREED" });

      const actual = shouldShowManageYourClaims(request);

      expect(actual).toBe(false);
    });

    test("true when status is AGREED", () => {
      const request = { path: "/poultry/vet-visits" };
      mockPoultrySessionData(request, { status: "AGREED" });

      const actual = shouldShowManageYourClaims(request);

      expect(actual).toBe(true);
    });

    test("true when status is AGREED on a claim route", () => {
      const request = { path: "/poultry/date-of-visit" };
      mockPoultrySessionData(request, { status: "AGREED" });

      const actual = shouldShowManageYourClaims(request);

      expect(actual).toBe(true);
    });

    test("true when status is AGREED on apply confirmation", () => {
      const request = { path: "/poultry/confirmation" };
      mockPoultrySessionData(request, { status: "AGREED" });

      const actual = shouldShowManageYourClaims(request);

      expect(actual).toBe(true);
    });

    test("true on post declaration post (confirmation)", () => {
      const request = { path: "/poultry/declaration", method: "post" };
      mockPoultrySessionData(request, { status: "AGREED" });

      const actual = shouldShowManageYourClaims(request);

      expect(actual).toBe(true);
    });

    test("false on get declaration (before confirmation)", () => {
      const request = { path: "/poultry/declaration", method: "get" };
      mockPoultrySessionData(request, { status: "AGREED" });

      const actual = shouldShowManageYourClaims(request);

      expect(actual).toBe(false);
    });
  });
});

import { when } from "jest-when";
import { checkIfPoultryAgreement, shouldShowManageYourClaims } from "./agreement-helper.js";
import { getSessionData, sessionEntryKeys, sessionKeys } from "../session/index.js";
import {
  livestockApplyRoutes,
  dashboardRoutes,
  loginRoutes,
  poultryApplyRoutes,
} from "../constants/routes.js";

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

  test("reference starts with POUL", () => {
    const actual = checkIfPoultryAgreement({ reference: "POUL-83720-38287" });

    expect(actual).toBeTruthy();
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

  test("returns false when path is /signin-oidc", () => {
    const request = { path: loginRoutes.signInOidc };

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
    test.each([
      ["false when latestEndemicsApplication is null", "/livestock/manage-claims", null, false],
      [
        "false when latestEndemicsApplication is undefined",
        "/livestock/manage-claims",
        undefined,
        false,
      ],
      ["false when latestEndemicsApplication has no status", "/livestock/manage-claims", {}, false],
      ["false when status is not AGREED", "/livestock/manage-claims", { status: "PENDING" }, false],
      ["true when status is AGREED", "/livestock/manage-claims", { status: "AGREED" }, true],
      [
        "true when status is AGREED on a claim route",
        "/livestock/date-of-visit",
        { status: "AGREED" },
        true,
      ],
    ])("%s", (_name, path, latestApplication, expected) => {
      const method = "get";

      const request = { path, method };

      mockEndemicsSessionData(request, latestApplication);
      const actual = shouldShowManageYourClaims(request);

      expect(actual).toBe(expected);
    });

    test("false when status is not AGREED in endemics but agreed on poultry", () => {
      const path = "/livestock/manage-claims";
      const method = "get";
      const latestEndemicsApplication = { status: "PENDING" };
      const latestPoultryApplication = { status: "AGREED" };
      const expected = false;

      const request = { path, method };

      mockEndemicsSessionData(request, latestEndemicsApplication);
      mockPoultrySessionData(request, latestPoultryApplication);
      const actual = shouldShowManageYourClaims(request);

      expect(actual).toBe(expected);
    });

    test("true on post declaration (confirmation)", () => {
      const path = "/livestock/agreement-offer";
      const method = "post";
      const latestEndemicsApplication = { status: "AGREED" };
      const expected = true;

      const request = { path, method };

      mockEndemicsSessionData(request, latestEndemicsApplication);
      const actual = shouldShowManageYourClaims(request);

      expect(actual).toBe(expected);
    });

    test("false on get declaration (before confirmation)", () => {
      const path = "/livestock/agreement-offer";
      const method = "get";
      const latestEndemicsApplication = { status: "AGREED" };
      const expected = false;

      const request = { path, method };

      mockEndemicsSessionData(request, latestEndemicsApplication);
      const actual = shouldShowManageYourClaims(request);

      expect(actual).toBe(expected);
    });

    test("false when no status in livestock but agreed on poultry on endemics apply route", () => {
      const path = livestockApplyRoutes.timings;
      const method = "get";
      const latestPoultryApplication = { status: "AGREED" };
      const expected = false;

      const request = { path, method };

      mockPoultrySessionData(request, latestPoultryApplication);
      const actual = shouldShowManageYourClaims(request);

      expect(actual).toBe(expected);
    });
  });

  describe("poultry urls", () => {
    test.each([
      ["false when latestPoultryApplication is null", "/poultry/manage-claims", null, false],
      [
        "false when latestPoultryApplication is undefined",
        "/poultry/manage-claims",
        undefined,
        false,
      ],
      ["false when latestPoultryApplication has no status", "/poultry/manage-claims", {}, false],
      ["false when status is not AGREED", "/poultry/manage-claims", { status: "PENDING" }, false],
      ["true when status is AGREED", "/poultry/manage-claims", { status: "AGREED" }, true],
      [
        "true when status is AGREED on a claim route",
        "/poultry/date-of-visit",
        { status: "AGREED" },
        true,
      ],
    ])("%s", (_name, path, latestApplication, expected) => {
      const method = "get";

      const request = { path, method };

      mockPoultrySessionData(request, latestApplication);
      const actual = shouldShowManageYourClaims(request);

      expect(actual).toBe(expected);
    });

    test("false when status is not AGREED in poultry but agreed on endemics", () => {
      const path = "/poultry/manage-claims";
      const method = "get";
      const latestPoultryApplication = { status: "PENDING" };
      const latestEndemicsApplication = { status: "AGREED" };
      const expected = false;

      const request = { path, method };

      mockPoultrySessionData(request, latestPoultryApplication);
      mockEndemicsSessionData(request, latestEndemicsApplication);
      const actual = shouldShowManageYourClaims(request);

      expect(actual).toBe(expected);
    });

    test("true when status is AGREED on apply confirmation", () => {
      const path = "/poultry/agreement-offer";
      const method = "post";
      const latestPoultryApplication = { status: "AGREED" };
      const expected = true;

      const request = { path, method };

      mockPoultrySessionData(request, latestPoultryApplication);
      const actual = shouldShowManageYourClaims(request);

      expect(actual).toBe(expected);
    });

    test("true on post declaration post (confirmation)", () => {
      const path = "/poultry/agreement-offer";
      const method = "post";
      const latestPoultryApplication = { status: "AGREED" };
      const expected = true;

      const request = { path, method };

      mockPoultrySessionData(request, latestPoultryApplication);
      const actual = shouldShowManageYourClaims(request);

      expect(actual).toBe(expected);
    });

    test("false on get declaration (before confirmation)", () => {
      const path = "/poultry/agreement-offer";
      const method = "get";
      const latestPoultryApplication = { status: "AGREED" };
      const expected = false;

      const request = { path, method };

      mockPoultrySessionData(request, latestPoultryApplication);
      const actual = shouldShowManageYourClaims(request);

      expect(actual).toBe(expected);
    });

    test("false when no status in poultry but agreed on endemics on poultry apply route", () => {
      const path = poultryApplyRoutes.timings;
      const method = "get";
      const latestEndemicsApplication = { status: "AGREED" };
      const expected = false;

      const request = { path, method };

      mockEndemicsSessionData(request, latestEndemicsApplication);
      const actual = shouldShowManageYourClaims(request);

      expect(actual).toBe(expected);
    });
  });
});

import { when } from "jest-when";
import { checkIfPoultryAgreement, shouldShowManageYourClaims } from "./agreement-helper.js";
import { getSessionData, sessionEntryKeys, sessionKeys } from "../session/index.js";
import {
  livestockApplyRoutes,
  livestockClaimRoutes,
  dashboardRoutes,
  loginRoutes,
  poultryApplyRoutes,
  poultryClaimRoutes,
} from "../constants/routes.js";

jest.mock("../session/index.js");

expect.extend({
  /**
   * Asserts that `shouldShowManageYourClaims` returns true for `request` once the
   * relevant session lookup has been stubbed. The stubbing is done by the matcher
   * so the assertion reads as a single expressive line.
   *
   * @param {{ path: string, method: string }} request - the request to evaluate
   * @param {object} options
   * @param {(request: object, application: object) => void} options.mockSessionData -
   *   stubs the endemics or poultry session lookup for `request`
   *   (e.g. `mockEndemicsSessionData` / `mockPoultrySessionData`)
   * @param {object} options.application - the latest application the session returns
   * @returns {{ pass: boolean, message: () => string }}
   * @example
   * expect({ path, method: "get" }).toShowManageYourClaims({
   *   mockSessionData: mockEndemicsSessionData,
   *   application: { status: "AGREED" },
   * });
   */
  toShowManageYourClaims(request, { mockSessionData, application }) {
    mockSessionData(request, application);
    const pass = shouldShowManageYourClaims(request) === true;

    return {
      pass,
      message: () =>
        pass
          ? `expected ${request.method} ${request.path} not to show "manage your claims"`
          : `expected ${request.method} ${request.path} to show "manage your claims"`,
    };
  },
});

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
  const showsManageYourClaims = true;
  const doesNotShowManageYourClaims = false;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("returns false when path is /check-details", () => {
    const request = { path: dashboardRoutes.checkDetails };

    const actual = shouldShowManageYourClaims(request);

    expect(actual).toBe(doesNotShowManageYourClaims);
    expect(getSessionData).not.toHaveBeenCalled();
  });

  test("returns false when path is /select-funding", () => {
    const request = { path: dashboardRoutes.selectFunding };

    const actual = shouldShowManageYourClaims(request);

    expect(actual).toBe(doesNotShowManageYourClaims);
    expect(getSessionData).not.toHaveBeenCalled();
  });

  test("returns false when path is /signin-oidc", () => {
    const request = { path: loginRoutes.signInOidc };

    const actual = shouldShowManageYourClaims(request);

    expect(actual).toBe(doesNotShowManageYourClaims);
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
      [
        "false when latestEndemicsApplication is null",
        dashboardRoutes.manageYourClaims,
        null,
        doesNotShowManageYourClaims,
      ],
      [
        "false when latestEndemicsApplication is undefined",
        dashboardRoutes.manageYourClaims,
        undefined,
        doesNotShowManageYourClaims,
      ],
      [
        "false when latestEndemicsApplication has no status",
        dashboardRoutes.manageYourClaims,
        {},
        doesNotShowManageYourClaims,
      ],
      [
        "false when status is not AGREED",
        dashboardRoutes.manageYourClaims,
        { status: "PENDING" },
        doesNotShowManageYourClaims,
      ],
      [
        "true when status is AGREED",
        dashboardRoutes.manageYourClaims,
        { status: "AGREED" },
        showsManageYourClaims,
      ],
      [
        "true when status is AGREED on a claim route",
        livestockClaimRoutes.dateOfVisit,
        { status: "AGREED" },
        showsManageYourClaims,
      ],
    ])("%s", (_name, path, latestApplication, expected) => {
      const request = { path, method: "get" };
      const options = { mockSessionData: mockEndemicsSessionData, application: latestApplication };

      if (expected) {
        expect(request).toShowManageYourClaims(options);
      } else {
        expect(request).not.toShowManageYourClaims(options);
      }
    });

    test("false when status is not AGREED in endemics but agreed on poultry", () => {
      const path = dashboardRoutes.manageYourClaims;
      const method = "get";
      const latestEndemicsApplication = { status: "PENDING" };
      const latestPoultryApplication = { status: "AGREED" };
      const expected = doesNotShowManageYourClaims;

      const request = { path, method };

      mockEndemicsSessionData(request, latestEndemicsApplication);
      mockPoultrySessionData(request, latestPoultryApplication);
      const actual = shouldShowManageYourClaims(request);

      expect(actual).toBe(expected);
    });

    test("true on post declaration (confirmation)", () => {
      expect({ path: livestockApplyRoutes.declaration, method: "post" }).toShowManageYourClaims({
        mockSessionData: mockEndemicsSessionData,
        application: { status: "AGREED" },
      });
    });

    test("false on get declaration (before confirmation)", () => {
      expect({ path: livestockApplyRoutes.declaration, method: "get" }).not.toShowManageYourClaims({
        mockSessionData: mockEndemicsSessionData,
        application: { status: "AGREED" },
      });
    });

    test("false when no status in livestock but agreed on poultry on endemics apply route", () => {
      expect({ path: livestockApplyRoutes.timings, method: "get" }).not.toShowManageYourClaims({
        mockSessionData: mockPoultrySessionData,
        application: { status: "AGREED" },
      });
    });
  });

  describe("poultry urls", () => {
    test.each([
      [
        "false when latestPoultryApplication is null",
        dashboardRoutes.poultryManageClaims,
        null,
        doesNotShowManageYourClaims,
      ],
      [
        "false when latestPoultryApplication is undefined",
        dashboardRoutes.poultryManageClaims,
        undefined,
        doesNotShowManageYourClaims,
      ],
      [
        "false when latestPoultryApplication has no status",
        dashboardRoutes.poultryManageClaims,
        {},
        doesNotShowManageYourClaims,
      ],
      [
        "false when status is not AGREED",
        dashboardRoutes.poultryManageClaims,
        { status: "PENDING" },
        doesNotShowManageYourClaims,
      ],
      [
        "true when status is AGREED",
        dashboardRoutes.poultryManageClaims,
        { status: "AGREED" },
        showsManageYourClaims,
      ],
      [
        "true when status is AGREED on a claim route",
        poultryClaimRoutes.dateOfVisit,
        { status: "AGREED" },
        showsManageYourClaims,
      ],
    ])("%s", (_name, path, latestApplication, expected) => {
      const request = { path, method: "get" };
      const options = { mockSessionData: mockPoultrySessionData, application: latestApplication };

      if (expected) {
        expect(request).toShowManageYourClaims(options);
      } else {
        expect(request).not.toShowManageYourClaims(options);
      }
    });

    test("false when status is not AGREED in poultry but agreed on endemics", () => {
      const path = dashboardRoutes.poultryManageClaims;
      const method = "get";
      const latestPoultryApplication = { status: "PENDING" };
      const latestEndemicsApplication = { status: "AGREED" };
      const expected = doesNotShowManageYourClaims;

      const request = { path, method };

      mockPoultrySessionData(request, latestPoultryApplication);
      mockEndemicsSessionData(request, latestEndemicsApplication);
      const actual = shouldShowManageYourClaims(request);

      expect(actual).toBe(expected);
    });

    test("true when status is AGREED on apply confirmation", () => {
      expect({ path: poultryApplyRoutes.agreementOffer, method: "post" }).toShowManageYourClaims({
        mockSessionData: mockPoultrySessionData,
        application: { status: "AGREED" },
      });
    });

    test("true on post declaration post (confirmation)", () => {
      expect({ path: poultryApplyRoutes.agreementOffer, method: "post" }).toShowManageYourClaims({
        mockSessionData: mockPoultrySessionData,
        application: { status: "AGREED" },
      });
    });

    test("false on get declaration (before confirmation)", () => {
      expect({ path: poultryApplyRoutes.agreementOffer, method: "get" }).not.toShowManageYourClaims(
        {
          mockSessionData: mockPoultrySessionData,
          application: { status: "AGREED" },
        },
      );
    });

    test("false when no status in poultry but agreed on endemics on poultry apply route", () => {
      expect({ path: poultryApplyRoutes.timings, method: "get" }).not.toShowManageYourClaims({
        mockSessionData: mockEndemicsSessionData,
        application: { status: "AGREED" },
      });
    });
  });
});

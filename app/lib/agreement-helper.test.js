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

  const assertManageYourClaims = ({ path, method, mockSessionData, application, expected }) => {
    const request = { path, method };

    mockSessionData(request, application);
    const actual = shouldShowManageYourClaims(request);

    expect(actual).toBe(expected);
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
      assertManageYourClaims({
        path,
        method: "get",
        mockSessionData: mockEndemicsSessionData,
        application: latestApplication,
        expected,
      });
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
      assertManageYourClaims({
        path: livestockApplyRoutes.declaration,
        method: "post",
        mockSessionData: mockEndemicsSessionData,
        application: { status: "AGREED" },
        expected: showsManageYourClaims,
      });
    });

    test("false on get declaration (before confirmation)", () => {
      assertManageYourClaims({
        path: livestockApplyRoutes.declaration,
        method: "get",
        mockSessionData: mockEndemicsSessionData,
        application: { status: "AGREED" },
        expected: doesNotShowManageYourClaims,
      });
    });

    test("false when no status in livestock but agreed on poultry on endemics apply route", () => {
      assertManageYourClaims({
        path: livestockApplyRoutes.timings,
        method: "get",
        mockSessionData: mockPoultrySessionData,
        application: { status: "AGREED" },
        expected: doesNotShowManageYourClaims,
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
      assertManageYourClaims({
        path,
        method: "get",
        mockSessionData: mockPoultrySessionData,
        application: latestApplication,
        expected,
      });
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
      assertManageYourClaims({
        path: poultryApplyRoutes.agreementOffer,
        method: "post",
        mockSessionData: mockPoultrySessionData,
        application: { status: "AGREED" },
        expected: showsManageYourClaims,
      });
    });

    test("true on post declaration post (confirmation)", () => {
      assertManageYourClaims({
        path: poultryApplyRoutes.agreementOffer,
        method: "post",
        mockSessionData: mockPoultrySessionData,
        application: { status: "AGREED" },
        expected: showsManageYourClaims,
      });
    });

    test("false on get declaration (before confirmation)", () => {
      assertManageYourClaims({
        path: poultryApplyRoutes.agreementOffer,
        method: "get",
        mockSessionData: mockPoultrySessionData,
        application: { status: "AGREED" },
        expected: doesNotShowManageYourClaims,
      });
    });

    test("false when no status in poultry but agreed on endemics on poultry apply route", () => {
      assertManageYourClaims({
        path: poultryApplyRoutes.timings,
        method: "get",
        mockSessionData: mockEndemicsSessionData,
        application: { status: "AGREED" },
        expected: doesNotShowManageYourClaims,
      });
    });
  });
});

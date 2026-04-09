import * as cheerio from "cheerio";
import { getCrumbs } from "../../../utils/get-crumbs.js";
import {
  getSessionData,
  setSessionData,
  clearFundingSelection,
  sessionEntryKeys,
  sessionKeys,
} from "../../../../app/session/index.js";
import { createServer } from "../../../../app/server.js";
import { StatusCodes } from "http-status-codes";
import {
  applyRoutes,
  dashboardRoutes,
  poultryApplyRoutes,
} from "../../../../app/constants/routes.js";
import { when } from "jest-when";
import { axe } from "../../../helpers/axe-helper.js";
import { userType } from "../../../../app/constants/constants.js";
import { requestAuthorizationCodeUrl } from "../../../../app/auth/auth-code-grant/request-authorization-code-url.js";

jest.mock("../../../../app/session/index.js");
jest.mock("../../../../app/auth/auth-code-grant/request-authorization-code-url.js");
jest.mock("../../../../app/config/index.js", () => ({
  config: {
    ...jest.requireActual("../../../../app/config/index.js").config,
    poultry: {
      enabled: "true",
    },
  },
}));

const poultryAgreement = "POUL-1234-ABCD";
const livestockAgreement = "IAHW-1234-ABCD";

describe("select-funding", () => {
  const organisation = {
    id: "organisation",
    name: "org-name",
    address: "1 fake street, fakerton, FA1 2DA",
    sbi: "0123456789",
    farmerName: "Joe Bloggs",
    userType: userType.NEW_USER,
  };

  when(getSessionData)
    .calledWith(expect.anything(), sessionEntryKeys.organisation)
    .mockReturnValue(organisation);

  // This setup is needed because otherwise the backlink would be
  // empty and would fail the accessibility test
  when(getSessionData)
    .calledWith(expect.anything(), sessionEntryKeys.confirmedDetails, sessionKeys.confirmedDetails)
    .mockReturnValue(true);

  // Default to false for attachedToMultipleBusinesses
  when(getSessionData)
    .calledWith(
      expect.anything(),
      sessionEntryKeys.customer,
      sessionKeys.customer.attachedToMultipleBusinesses,
    )
    .mockReturnValue(false);

  const optionsBase = {
    auth: {
      strategy: "cookie",
      credentials: { reference: "1111", sbi: "111111111" },
    },
    url: dashboardRoutes.selectFunding,
  };

  let server;

  beforeAll(async () => {
    server = await createServer();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  describe("GET /select-funding", () => {
    test("shows the organisation details", async () => {
      const res = await server.inject({ ...optionsBase, method: "GET" });

      expect(await axe(res.payload)).toHaveNoViolations();
      const $ = cheerio.load(res.payload);
      expect($(".govuk-heading-m").eq(1).text().trim()).toBe(organisation.name);
      expect($("#SBI").text()).toContain(organisation.sbi);
      expect($("#SBI").text()).toContain(organisation.farmerName);
    });

    test("returns create agreement text for livestock if no agreement", async () => {
      when(getSessionData)
        .calledWith(
          expect.anything(),
          sessionEntryKeys.endemicsClaim,
          sessionKeys.endemicsClaim.latestEndemicsApplication,
        )
        .mockReturnValue(undefined);

      const res = await server.inject({ ...optionsBase, method: "GET" });

      expect(await axe(res.payload)).toHaveNoViolations();
      const $ = cheerio.load(res.payload);
      expect($("h1").text()).toMatch("Select funding");
      expect($('input[name="fundingType"]').first().next("label").text().trim()).toBe(
        "Cattle, pig, and sheep review and follow-up",
      );
      expect($(".govuk-radios__hint").first().text().trim()).toBe(
        "Create an agreement for improve animal health and welfare for cattle, pigs and sheep",
      );
    });

    test("returns create agreement text for poultry if no agreement", async () => {
      const res = await server.inject({ ...optionsBase, method: "GET" });

      expect(await axe(res.payload)).toHaveNoViolations();
      const $ = cheerio.load(res.payload);
      expect($("h1").text()).toMatch("Select funding");
      expect($('input[name="fundingType"]').eq(1).next("label").text().trim()).toBe(
        "Poultry biosecurity review",
      );
      expect($(".govuk-radios__hint").eq(1).text().trim()).toBe(
        "Create an agreement for poultry biosecurity assessments",
      );
    });

    test("returns create claim text for livestock if agreement exists", async () => {
      when(getSessionData)
        .calledWith(
          expect.anything(),
          sessionEntryKeys.endemicsClaim,
          sessionKeys.endemicsClaim.latestEndemicsApplication,
        )
        .mockReturnValue({ reference: livestockAgreement });
      const res = await server.inject({ ...optionsBase, method: "GET" });

      expect(await axe(res.payload)).toHaveNoViolations();
      const $ = cheerio.load(res.payload);
      expect($("h1").text()).toMatch("Select funding");
      expect($('input[name="fundingType"]').first().next("label").text().trim()).toBe(
        "Cattle, pig, and sheep review and follow-up",
      );
      expect($(".govuk-radios__hint").first().text().trim()).toBe(
        `Agreement number: ${livestockAgreement}Create or manage claims for this agreement`,
      );
    });

    test("returns create claim text for poultry if  agreement exists", async () => {
      when(getSessionData)
        .calledWith(
          expect.anything(),
          sessionEntryKeys.poultryClaim,
          sessionKeys.poultryClaim.latestPoultryApplication,
        )
        .mockReturnValue({ reference: poultryAgreement });

      const res = await server.inject({ ...optionsBase, method: "GET" });

      expect(await axe(res.payload)).toHaveNoViolations();
      const $ = cheerio.load(res.payload);
      expect($("h1").text()).toMatch("Select funding");
      expect($('input[name="fundingType"]').eq(1).next("label").text().trim()).toBe(
        "Poultry biosecurity review",
      );
      expect($(".govuk-radios__hint").eq(1).text().trim()).toBe(
        `Agreement number: ${poultryAgreement}Create or manage claims for this agreement`,
      );
    });

    test("shows 'Claim for a different business' link when attachedToMultipleBusinesses is true", async () => {
      const mockUrl = new URL("https://example.com/auth");
      requestAuthorizationCodeUrl.mockResolvedValue(mockUrl);

      when(getSessionData)
        .calledWith(
          expect.anything(),
          sessionEntryKeys.customer,
          sessionKeys.customer.attachedToMultipleBusinesses,
        )
        .mockReturnValue(true);
      const res = await server.inject({ ...optionsBase, method: "GET" });

      expect(res.statusCode).toBe(StatusCodes.OK);
      expect(requestAuthorizationCodeUrl).toHaveBeenCalled();

      const $ = cheerio.load(res.payload);
      const mbiLink = $("#MBILink");
      expect(mbiLink.text()).toBe("Claim for a different business");
      expect(mbiLink.attr("href")).toBe(mockUrl.toString());
    });

    test("does not show Manage your claims link even with AGREED status", async () => {
      when(getSessionData)
        .calledWith(
          expect.anything(),
          sessionEntryKeys.endemicsClaim,
          sessionKeys.endemicsClaim.latestEndemicsApplication,
        )
        .mockReturnValue({ status: "AGREED", reference: livestockAgreement });

      const res = await server.inject({ ...optionsBase, method: "GET" });

      expect(res.statusCode).toBe(StatusCodes.OK);

      expect(res.payload).not.toContain("Manage your claims");
    });
  });

  describe("POST /select-funding", () => {
    let postOptionsBase;

    beforeEach(async () => {
      const crumb = await getCrumbs(server);
      postOptionsBase = {
        ...optionsBase,
        method: "POST",
        headers: { cookie: `crumb=${crumb}` },
        payload: { crumb },
      };
    });

    test("redirects to livestock apply when user selects livestock without an agreement", async () => {
      when(getSessionData)
        .calledWith(
          expect.anything(),
          sessionEntryKeys.endemicsClaim,
          sessionKeys.endemicsClaim.latestEndemicsApplication,
        )
        .mockReturnValue(undefined);

      const options = {
        ...postOptionsBase,
        payload: {
          ...postOptionsBase.payload,
          fundingType: "IAHW",
        },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY);
      expect(res.headers.location).toEqual(applyRoutes.youCanClaimMultiple);
      expect(clearFundingSelection).toHaveBeenCalledWith(expect.anything());
      expect(setSessionData).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.fundingSelection,
        sessionKeys.fundingSelection.selectedFunding,
        "IAHW",
      );
      expect(setSessionData).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.fundingSelection,
        sessionKeys.fundingSelection.agreement,
        undefined,
      );
    });

    test("redirects to vet-visits when user selects livestock with an agreement", async () => {
      when(getSessionData)
        .calledWith(
          expect.anything(),
          sessionEntryKeys.endemicsClaim,
          sessionKeys.endemicsClaim.latestEndemicsApplication,
        )
        .mockReturnValue({ reference: livestockAgreement });

      const options = {
        ...postOptionsBase,
        payload: {
          ...postOptionsBase.payload,
          fundingType: "IAHW",
        },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY);
      expect(res.headers.location).toEqual(dashboardRoutes.manageYourClaims);
      expect(clearFundingSelection).toHaveBeenCalledWith(expect.anything());
      expect(setSessionData).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.fundingSelection,
        sessionKeys.fundingSelection.selectedFunding,
        "IAHW",
      );
      expect(setSessionData).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.fundingSelection,
        sessionKeys.fundingSelection.agreement,
        livestockAgreement,
      );
    });

    test("redirects to poultry apply when user selects poultry without an agreement", async () => {
      when(getSessionData)
        .calledWith(
          expect.anything(),
          sessionEntryKeys.poultryClaim,
          sessionKeys.poultryClaim.latestPoultryApplication,
        )
        .mockReturnValue(undefined);

      const options = {
        ...postOptionsBase,
        payload: {
          ...postOptionsBase.payload,
          fundingType: "POUL",
        },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY);
      expect(res.headers.location).toEqual(poultryApplyRoutes.youCanClaimMultiple);
      expect(clearFundingSelection).toHaveBeenCalledWith(expect.anything());
      expect(setSessionData).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.fundingSelection,
        sessionKeys.fundingSelection.selectedFunding,
        "POUL",
      );
      expect(setSessionData).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.fundingSelection,
        sessionKeys.fundingSelection.agreement,
        undefined,
      );
    });

    test("redirects to vet-visits when user selects poultry with an agreement", async () => {
      when(getSessionData)
        .calledWith(
          expect.anything(),
          sessionEntryKeys.poultryClaim,
          sessionKeys.poultryClaim.latestPoultryApplication,
        )
        .mockReturnValue({ reference: poultryAgreement });

      const options = {
        ...postOptionsBase,
        payload: {
          ...postOptionsBase.payload,
          fundingType: "POUL",
        },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY);
      expect(res.headers.location).toEqual(dashboardRoutes.poultryManageYourClaims);
      expect(clearFundingSelection).toHaveBeenCalledWith(expect.anything());
      expect(setSessionData).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.fundingSelection,
        sessionKeys.fundingSelection.selectedFunding,
        "POUL",
      );
      expect(setSessionData).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.fundingSelection,
        sessionKeys.fundingSelection.agreement,
        poultryAgreement,
      );
    });

    test("show inline Error if continue is pressed and no funding selected", async () => {
      const options = {
        ...postOptionsBase,
      };

      const response = await server.inject(options);

      expect(await axe(response.payload)).toHaveNoViolations();
      const $ = cheerio.load(response.payload);
      const errorMessage = "Select a funding";

      expect($(".govuk-error-summary li > a").text()).toMatch(errorMessage);
      expect($(".govuk-error-message").text()).toContain(errorMessage);
      expect(clearFundingSelection).toHaveBeenCalledWith(expect.anything());
      expect(setSessionData).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.fundingSelection,
        "error",
        "No funding selected",
      );
    });

    test("shows 'Claim for a different business' link in failAction when attachedToMultipleBusinesses is true", async () => {
      const mockUrl = new URL("https://example.com/auth");
      requestAuthorizationCodeUrl.mockResolvedValue(mockUrl);

      when(getSessionData)
        .calledWith(
          expect.anything(),
          sessionEntryKeys.customer,
          sessionKeys.customer.attachedToMultipleBusinesses,
        )
        .mockReturnValue(true);

      const options = {
        ...postOptionsBase,
      };

      const response = await server.inject(options);

      expect(response.statusCode).toBe(StatusCodes.BAD_REQUEST);
      expect(requestAuthorizationCodeUrl).toHaveBeenCalled();

      const $ = cheerio.load(response.payload);
      const mbiLink = $("#MBILink");
      expect(mbiLink.text()).toBe("Claim for a different business");
      expect(mbiLink.attr("href")).toBe(mockUrl.toString());
    });
  });
});

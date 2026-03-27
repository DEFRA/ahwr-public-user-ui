import * as cheerio from "cheerio";
import { getCrumbs } from "../../../utils/get-crumbs.js";
import {
  getSessionData,
  setSessionData,
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

jest.mock("../../../../app/session/index.js");
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
      expect($('input[name="type"]').first().next("label").text().trim()).toBe(
        "Cattle, pig, and sheep review and follow-up",
      );
      expect($(".govuk-radios__hint").first().text().trim()).toBe(
        "Create an agreement for cattle, sheep and pig",
      );
    });

    test("returns create agreement text for poultry if no agreement", async () => {
      const res = await server.inject({ ...optionsBase, method: "GET" });

      expect(await axe(res.payload)).toHaveNoViolations();
      const $ = cheerio.load(res.payload);
      expect($("h1").text()).toMatch("Select funding");
      expect($('input[name="type"]').eq(1).next("label").text().trim()).toBe(
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
      expect($('input[name="type"]').first().next("label").text().trim()).toBe(
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
      expect($('input[name="type"]').eq(1).next("label").text().trim()).toBe(
        "Poultry biosecurity review",
      );
      expect($(".govuk-radios__hint").eq(1).text().trim()).toBe(
        `Agreement number: ${poultryAgreement}Create or manage claims for this agreement`,
      );
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

    test("returns 302 and redirects to livestock apply when user selects livestock", async () => {
      const options = {
        ...postOptionsBase,
        payload: {
          ...postOptionsBase.payload,
          type: "IAHW",
        },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY);
      expect(setSessionData).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.poultryApplyData,
        sessionKeys.poultryApplyData.type,
        "IAHW",
      );
      expect(res.headers.location).toEqual(applyRoutes.youCanClaimMultiple);
    });

    test("returns 302 and redirects to poultry apply when user selects poultry", async () => {
      const options = {
        ...postOptionsBase,
        payload: {
          ...postOptionsBase.payload,
          type: "POUL",
        },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY);
      expect(setSessionData).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.poultryApplyData,
        sessionKeys.poultryApplyData.type,
        "POUL",
      );
      expect(res.headers.location).toEqual(poultryApplyRoutes.youCanClaimMultiple);
    });
  });
});

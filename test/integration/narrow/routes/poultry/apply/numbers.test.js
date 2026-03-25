import * as cheerio from "cheerio";
import { ok } from "../../../../../utils/phase-banner-expect";
import { getCrumbs } from "../../../../../utils/get-crumbs.js";
import {
  getSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../../../../../app/session/index.js";
import { createServer } from "../../../../../../app/server";
import { getApplicationsBySbi } from "../../../../../../app/api-requests/application-api";
import { poultryApplyRoutes } from "../../../../../../app/constants/routes";
import { userType } from "../../../../../../app/constants/constants";
import { when } from "jest-when";
import { axe } from "../../../../../helpers/axe-helper.js";

jest.mock("../../../../../../app/api-requests/application-api");
jest.mock("../../../../../../app/session/index.js");
jest.mock("../../../../../../app/config/index.js", () => ({
  config: {
    ...jest.requireActual("../../../../../../app/config/index.js").config,
    poultry: {
      enabled: "true",
    },
  },
}));

describe("Check review numbers page test", () => {
  const auth = {
    strategy: "cookie",
    credentials: { reference: "1111", sbi: "111111111" },
  };

  const organisation = {
    id: "organisation",
    name: "org-name",
    address: "1 fake street, fakerton, FA1 2DA",
    sbi: "0123456789",
    userType: userType.NEW_USER,
  };
  const applications = [{ organisation, reference: "TEMP-PJ7E-WSI8" }];
  getApplicationsBySbi.mockReturnValue(applications);

  when(getSessionData)
    .calledWith(expect.anything(), sessionEntryKeys.application)
    .mockReturnValue({ reference: "IAHW-1234-ABCD" });

  when(getSessionData)
    .calledWith(expect.anything(), sessionEntryKeys.organisation)
    .mockReturnValue(organisation);

  when(getSessionData)
    .calledWith(expect.anything(), sessionEntryKeys.confirmedDetails, sessionKeys.confirmedDetails)
    .mockReturnValue(true);

  const options = {
    auth,
    url: poultryApplyRoutes.numbers,
  };

  let server;

  beforeAll(async () => {
    server = await createServer();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  describe("GET /numbers route when logged in", () => {
    test("returns 200 and has correct backLink", async () => {
      const res = await server.inject({ ...options, method: "GET" });

      expect(res.statusCode).toBe(200);
      expect(await axe(res.payload)).toHaveNoViolations();

      const $ = cheerio.load(res.payload);
      const titleClassName = ".govuk-heading-l";
      const title = "Minimum number of poultry in the unit";
      const pageTitleByClassName = $(titleClassName).text();
      const pageTitleByName = $("title").text();
      const fullTitle = `${title} - Get funding to improve animal health and welfare`;
      const backLinkUrlByClassName = $(".govuk-back-link").attr("href");

      expect(pageTitleByName).toContain(fullTitle);
      expect(pageTitleByClassName).toEqual(title);
      expect(backLinkUrlByClassName).toContain(poultryApplyRoutes.youCanClaimMultiple);
      ok($);
    });
  });

  describe("POST /poultry/numbers route", () => {
    let crumb;

    beforeEach(async () => {
      crumb = await getCrumbs(server);
    });

    test("returns 302 to next page when agree answer given", async () => {
      const res = await server.inject({
        ...options,
        method: "POST",
        headers: { cookie: `crumb=${crumb}` },
        payload: { crumb, agreementStatus: "agree" },
      });

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toEqual(poultryApplyRoutes.timings);
    });

    test("returns 200 to offer rejected page when not agree answer given", async () => {
      const res = await server.inject({
        ...options,
        method: "POST",
        headers: { cookie: `crumb=${crumb}` },
        payload: { crumb, agreementStatus: "notAgree" },
      });

      expect(res.statusCode).toBe(200);
      expect(await axe(res.payload)).toHaveNoViolations();
      expect(res.payload).toContain("You cannot continue with your application");
    });
  });
});

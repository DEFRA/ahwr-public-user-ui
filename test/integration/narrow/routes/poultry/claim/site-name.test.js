import * as cheerio from "cheerio";
import { when } from "jest-when";
import { createServer } from "../../../../../../app/server.js";
import {
  testBrowserPageTitle,
  testPageHeading,
} from "../../../../../helpers/page-title-and-heading.js";
import {
  emitHerdEvent,
  getSessionData,
  sessionEntryKeys,
  sessionKeys,
  setSessionData,
} from "../../../../../../app/session/index.js";
import { axe } from "../../../../../helpers/axe-helper.js";
import { getCrumbs } from "../../../../../utils/get-crumbs.js";

const auth = { credentials: { reference: "1111", sbi: "111111111" }, strategy: "cookie" };
const url = "/poultry/site-name";

jest.mock("../../../../../../app/session/index.js");

describe("/poultry/site-name", () => {
  let server;
  let crumb;

  beforeAll(async () => {
    setSessionData.mockImplementation(() => {});
    server = await createServer();
    await server.initialize();
  });

  afterAll(async () => {
    await server.stop();
  });

  beforeEach(() => {
    when(getSessionData)
      .calledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.latestPoultryApplication,
      )
      .mockReturnValue({ status: "AGREED" });

    when(getSessionData)
      .calledWith(
        expect.anything(),
        sessionEntryKeys.confirmedDetails,
        sessionKeys.confirmedDetails,
      )
      .mockReturnValue(true);

    when(getSessionData)
      .calledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.reference,
      )
      .mockReturnValue("POUL-1LZ5-ELVQ");
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  const expectSiteHint = ($) => {
    expect($(".govuk-hint").text().trim()).toContain(
      "Enter the site name from the ’Tell us about this poultry site’ section of the summary the vet gave you.",
    );
  };

  describe("GET", () => {
    const getResponse = () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({ reference: "TEMP-6GSE-PIR8", herds: [{ id: "1" }] });
      return server.inject({ method: "GET", url, auth });
    };
    const browserTitle = "Poultry site name";
    const pageHeader = "Enter the site name";
    testBrowserPageTitle({ title: browserTitle, getResponse });
    testPageHeading({ heading: pageHeader, getResponse });

    test("returns 200 and displays page correctly", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          reference: "TEMP-6GSE-PIR8",
          herds: [
            {
              id: "1",
            },
          ],
        });

      const res = await server.inject({ method: "GET", url, auth });

      expect(await axe(res.payload)).toHaveNoViolations();
      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      expect($(".govuk-back-link").attr("href")).toContain("/poultry/select-site");
      expectSiteHint($);
    });

    test("returns 200 and displays previously entered site name", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          reference: "TEMP-6GSE-PIR8",
          herdName: "Commercial Herd",
          herds: [
            {
              id: "1",
            },
          ],
        });

      const res = await server.inject({ method: "GET", url, auth });

      expect(await axe(res.payload)).toHaveNoViolations();
      expect(res.statusCode).toBe(200);

      const $ = cheerio.load(res.payload);
      expect($(".govuk-back-link").attr("href")).toContain("/poultry/select-site");
      expectSiteHint($);
      expect($("#herdName").val()).toBe("Commercial Herd");
    });

    test("returns 200 with back link to date of review when no previous sites", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          reference: "TEMP-6GSE-PIR8",
          herds: [],
        });

      const res = await server.inject({ method: "GET", url, auth });

      expect(await axe(res.payload)).toHaveNoViolations();
      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      expect($(".govuk-back-link").attr("href")).toContain("/poultry/date-of-visit");
      expectSiteHint($);
    });
  });

  describe("POST", () => {
    beforeAll(async () => {
      crumb = await getCrumbs(server);
    });

    test.each([
      {
        scenario: "there are no previous claims",
        session: { reference: "TEMP-6GSE-PIR8" },
      },
      {
        scenario: "site name does not exist in previous claims",
        session: {
          reference: "TEMP-6GSE-PIR8",
          previousClaims: [
            { herd: { herdName: "First herd" } },
            { herd: { herdName: "Second herd" } },
          ],
        },
      },
    ])(
      "saves site name and navigates to next page when payload valid and $scenario",
      async ({ session }) => {
        getSessionData.mockReturnValue(session);

        const res = await server.inject({
          method: "POST",
          url,
          auth,
          payload: { crumb, herdName: "    Commercial Herd    " },
          headers: { cookie: `crumb=${crumb}` },
        });

        expect(res.statusCode).toBe(302);
        expect(res.headers.location).toEqual("/poultry/cph");
        expect(setSessionData).toHaveBeenCalled();
        expect(emitHerdEvent).toHaveBeenCalled();
      },
    );

    test.each([
      {
        scenario: "site name is missing",
        herdName: undefined,
        session: { reference: "TEMP-6GSE-PIR8", herds: [{ id: 1 }] },
        error: "Enter the site name",
      },
      {
        scenario: "site name is less than 2 characters",
        herdName: "a",
        session: { reference: "TEMP-6GSE-PIR8", herds: [{ id: 1 }] },
        error: "Enter a site name of between 2 and 30 characters",
      },
      {
        scenario: "site name is greater than 30 characters",
        herdName: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        session: { reference: "TEMP-6GSE-PIR8", herds: [{ id: 1 }] },
        error: "Enter a site name of between 2 and 30 characters",
      },
      {
        scenario: "site name contains an invalid character",
        herdName: "abc$",
        session: { reference: "TEMP-6GSE-PIR8", herds: [{ id: 1 }] },
        error:
          "Name must only include letters a to z, numbers and special characters such as hyphens, spaces and apostrophes.",
      },
      {
        scenario: "site name has already been used in a previous claim",
        herdName: "Commercial Herd",
        session: {
          reference: "TEMP-6GSE-PIR8",
          herds: [{ id: 1 }],
          previousClaims: [{ herd: { name: "Commercial Herd" } }],
        },
        error: "You have already used this name, the name must be unique",
      },
    ])("displays errors when $scenario", async ({ herdName, session, error }) => {
      getSessionData.mockReturnValue(session);

      const res = await server.inject({
        method: "POST",
        url,
        auth,
        payload: { crumb, herdName },
        headers: { cookie: `crumb=${crumb}` },
      });

      expect(await axe(res.payload)).toHaveNoViolations();
      const $ = cheerio.load(res.payload);
      expect(res.statusCode).toBe(400);
      expect($("h2.govuk-error-summary__title").text()).toContain("There is a problem");
      expect($('a[href="#herdName"]').text()).toContain(error);
      expect($(".govuk-back-link").attr("href")).toContain("/poultry/select-site");
      expectSiteHint($);
      expect(emitHerdEvent).not.toHaveBeenCalled();
    });

    test("displays errors with back link to date of review when no previous sites", async () => {
      getSessionData.mockReturnValue({
        reference: "TEMP-6GSE-PIR8",
      });

      const res = await server.inject({
        method: "POST",
        url,
        auth,
        payload: { crumb },
        headers: { cookie: `crumb=${crumb}` },
      });

      expect(await axe(res.payload)).toHaveNoViolations();
      const $ = cheerio.load(res.payload);
      expect(res.statusCode).toBe(400);
      expect($("h2.govuk-error-summary__title").text()).toContain("There is a problem");
      expect($('a[href="#herdName"]').text()).toContain("Enter the site name");
      expect($(".govuk-back-link").attr("href")).toContain("/poultry/date-of-visit");
      expectSiteHint($);
      expect(emitHerdEvent).not.toHaveBeenCalled();
    });
  });
});

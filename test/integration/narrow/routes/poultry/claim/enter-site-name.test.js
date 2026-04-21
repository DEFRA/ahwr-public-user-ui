import * as cheerio from "cheerio";
import { when } from "jest-when";
import { createServer } from "../../../../../../app/server.js";
import {
  emitHerdEvent,
  getSessionData,
  sessionEntryKeys,
  sessionKeys,
  setSessionData,
} from "../../../../../../app/session/index.js";
import { axe } from "../../../../../helpers/axe-helper.js";
import { getCrumbs } from "../../../../../utils/get-crumbs.js";
import { config } from "../../../../../../app/config/index.js";

const auth = { credentials: { reference: "1111", sbi: "111111111" }, strategy: "cookie" };
const url = "/poultry/enter-site-name";

jest.mock("../../../../../../app/session/index.js");

describe("/poultry/enter-site-name", () => {
  let server;
  let crumb;

  beforeAll(async () => {
    config.poultry.enabled = true;
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
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  const expectSiteText = ($) => {
    expect($("title").text().trim()).toContain(
      "Enter the site name - Get funding to improve animal health and welfare - GOV.UKGOV.UK",
    );
    expect($(".govuk-label--l").text().trim()).toBe("Enter the site name");
    expect($(".govuk-hint").text().trim()).toContain("Tell us about this site");
    expect($(".govuk-details__summary-text").text().trim()).toBe(
      "I don't have the site details from the vet",
    );
    expect($(".govuk-details__text").text().trim()).toContain("Tell us about this site");
  };

  describe("GET", () => {
    test("returns 200 and displays page correctly with previous claims", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          reference: "TEMP-6GSE-PIR8",
          previousClaims: [
            {
              herd: { id: "1", name: "Farm 1", cph: "12/345/6789" },
            },
          ],
        });

      const res = await server.inject({ method: "GET", url, auth });

      expect(await axe(res.payload)).toHaveNoViolations();
      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      expect($(".govuk-back-link").attr("href")).toContain("/poultry/select-the-site");
      expectSiteText($);
    });

    test("returns 200 and displays previously entered site name", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          reference: "TEMP-6GSE-PIR8",
          herdName: "Commercial Herd",
          previousClaims: [
            {
              herd: { id: "1", name: "Farm 1", cph: "12/345/6789" },
            },
          ],
        });

      const res = await server.inject({ method: "GET", url, auth });

      expect(await axe(res.payload)).toHaveNoViolations();
      expect(res.statusCode).toBe(200);

      const $ = cheerio.load(res.payload);
      expect($(".govuk-back-link").attr("href")).toContain("/poultry/select-the-site");
      expectSiteText($);
      expect($("#herdName").val()).toBe("Commercial Herd");
    });

    test("returns 200 with back link to date of review when no previous claims", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          reference: "TEMP-6GSE-PIR8",
          previousClaims: [],
        });

      const res = await server.inject({ method: "GET", url, auth });

      expect(await axe(res.payload)).toHaveNoViolations();
      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      expect($(".govuk-back-link").attr("href")).toContain("/poultry/date-of-review");
      expectSiteText($);
    });
  });

  describe("POST", () => {
    beforeAll(async () => {
      crumb = await getCrumbs(server);
    });

    test("navigates to the correct page when payload valid", async () => {
      getSessionData.mockReturnValue({
        reference: "TEMP-6GSE-PIR8",
      });

      const res = await server.inject({
        method: "POST",
        url,
        auth,
        payload: { crumb, herdName: "    Commercial Herd    " },
        headers: { cookie: `crumb=${crumb}` },
      });

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toEqual("/poultry/enter-cph-number");
      expect(setSessionData).toHaveBeenCalled();
      expect(emitHerdEvent).toHaveBeenCalled();
    });

    test("saves site name in session and navigates to next page when site name does not exist in previous claims", async () => {
      getSessionData.mockReturnValue({
        reference: "TEMP-6GSE-PIR8",
        previousClaims: [
          {
            herd: {
              herdName: "First herd",
            },
          },
          {
            herd: {
              herdName: "Second herd",
            },
          },
        ],
      });

      const res = await server.inject({
        method: "POST",
        url,
        auth,
        payload: { crumb, herdName: "    Commercial Herd    " },
        headers: { cookie: `crumb=${crumb}` },
      });

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toEqual("/poultry/enter-cph-number");
      expect(setSessionData).toHaveBeenCalled();
      expect(emitHerdEvent).toHaveBeenCalled();
    });

    test("displays errors when site name is missing", async () => {
      getSessionData.mockReturnValue({
        reference: "TEMP-6GSE-PIR8",
        previousClaims: [{ herd: { id: "1", name: "Farm 1", cph: "12/345/6789" } }],
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
      expect($(".govuk-back-link").attr("href")).toContain("/poultry/select-the-site");
      expectSiteText($);
      expect(emitHerdEvent).not.toHaveBeenCalled();
    });

    test("displays errors when site name is less than 2 characters", async () => {
      getSessionData.mockReturnValue({
        reference: "TEMP-6GSE-PIR8",
        previousClaims: [{ herd: { id: "1", name: "Farm 1", cph: "12/345/6789" } }],
      });

      const res = await server.inject({
        method: "POST",
        url,
        auth,
        payload: { crumb, herdName: "a" },
        headers: { cookie: `crumb=${crumb}` },
      });

      expect(await axe(res.payload)).toHaveNoViolations();
      const $ = cheerio.load(res.payload);
      expect(res.statusCode).toBe(400);
      expect($("h2.govuk-error-summary__title").text()).toContain("There is a problem");
      expect($('a[href="#herdName"]').text()).toContain("Name must be between 2 and 30 characters");
      expect($(".govuk-back-link").attr("href")).toContain("/poultry/select-the-site");
      expectSiteText($);
      expect(emitHerdEvent).not.toHaveBeenCalled();
    });

    test("displays errors when site name is greater than 30 characters", async () => {
      getSessionData.mockReturnValue({
        reference: "TEMP-6GSE-PIR8",
        previousClaims: [{ herd: { id: "1", name: "Farm 1", cph: "12/345/6789" } }],
      });

      const res = await server.inject({
        method: "POST",
        url,
        auth,
        payload: { crumb, herdName: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
        headers: { cookie: `crumb=${crumb}` },
      });

      expect(await axe(res.payload)).toHaveNoViolations();
      const $ = cheerio.load(res.payload);
      expect(res.statusCode).toBe(400);
      expect($("h2.govuk-error-summary__title").text()).toContain("There is a problem");
      expect($('a[href="#herdName"]').text()).toContain("Name must be between 2 and 30 characters");
      expect($(".govuk-back-link").attr("href")).toContain("/poultry/select-the-site");
      expectSiteText($);
      expect(emitHerdEvent).not.toHaveBeenCalled();
    });

    test("displays errors when site name contains an invalid character", async () => {
      getSessionData.mockReturnValue({
        reference: "TEMP-6GSE-PIR8",
        previousClaims: [{ herd: { id: "1", name: "Farm 1", cph: "12/345/6789" } }],
      });

      const res = await server.inject({
        method: "POST",
        url,
        auth,
        payload: { crumb, herdName: "abc$" },
        headers: { cookie: `crumb=${crumb}` },
      });

      expect(await axe(res.payload)).toHaveNoViolations();
      const $ = cheerio.load(res.payload);
      expect(res.statusCode).toBe(400);
      expect($("h2.govuk-error-summary__title").text()).toContain("There is a problem");
      expect($('a[href="#herdName"]').text()).toContain(
        "Name must only include letters a to z, numbers and special characters such as hyphens, spaces and apostrophes.",
      );
      expect($(".govuk-back-link").attr("href")).toContain("/poultry/select-the-site");
      expectSiteText($);
      expect(emitHerdEvent).not.toHaveBeenCalled();
    });

    test("displays errors when site name has already been used in a previous claim", async () => {
      getSessionData.mockReturnValue({
        reference: "TEMP-6GSE-PIR8",
        previousClaims: [
          {
            herd: {
              id: "1",
              name: "Commercial Herd",
              cph: "12/345/6789",
            },
          },
        ],
      });

      const res = await server.inject({
        method: "POST",
        url,
        auth,
        payload: { crumb, herdName: "Commercial Herd" },
        headers: { cookie: `crumb=${crumb}` },
      });

      expect(await axe(res.payload)).toHaveNoViolations();
      const $ = cheerio.load(res.payload);
      expect(res.statusCode).toBe(400);
      expect($("h2.govuk-error-summary__title").text()).toContain("There is a problem");
      expect($('a[href="#herdName"]').text()).toContain(
        "You have already used this name, the name must be unique",
      );
      expect($(".govuk-back-link").attr("href")).toContain("/poultry/select-the-site");
      expectSiteText($);
      expect(emitHerdEvent).not.toHaveBeenCalled();
    });

    test("displays errors with back link to date of review when no previous claims", async () => {
      getSessionData.mockReturnValue({
        reference: "TEMP-6GSE-PIR8",
        previousClaims: [],
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
      expect($(".govuk-back-link").attr("href")).toContain("/poultry/date-of-review");
      expectSiteText($);
      expect(emitHerdEvent).not.toHaveBeenCalled();
    });
  });
});

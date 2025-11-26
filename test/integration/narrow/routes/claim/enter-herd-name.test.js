import * as cheerio from "cheerio";
import { createServer } from "../../../../../app/server.js";
import { getCrumbs } from "../../../../utils/get-crumbs.js";
import expectPhaseBanner from "assert";
import { getSessionData, setSessionData, emitHerdEvent } from "../../../../../app/session/index.js";

jest.mock("../../../../../app/session/index.js");

describe("/enter-herd-name tests", () => {
  const url = `/enter-herd-name`;
  const auth = {
    credentials: { reference: "1111", sbi: "111111111" },
    strategy: "cookie",
  };
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

  afterEach(() => {
    jest.resetAllMocks();
  });

  const expectHerdText = ($) => {
    expect($("title").text().trim()).toContain(
      "Enter the herd name - Get funding to improve animal health and welfare - GOV.UKGOV.UK",
    );
    expect($(".govuk-label--l").text().trim()).toBe("Enter the herd name");
    expect($(".govuk-hint").text().trim()).toContain("Tell us about this herd");
    expect($(".govuk-details__summary-text").text().trim()).toBe(
      "I don't have the herd details from the vet",
    );
    expect($(".govuk-details__text").text().trim()).toContain("Tell us about this herd");
    expectPhaseBanner.ok($);
  };

  const expectFlockText = ($) => {
    expect($("title").text().trim()).toContain(
      "Enter the flock name - Get funding to improve animal health and welfare - GOV.UKGOV.UK",
    );
    expect($(".govuk-label--l").text().trim()).toBe("Enter the flock name");
    expect($(".govuk-hint").text().trim()).toContain("Tell us about this flock");
    expect($(".govuk-details__summary-text").text().trim()).toBe(
      "I don't have the flock details from the vet",
    );
    expect($(".govuk-details__text").text().trim()).toContain("Tell us about this flock");
  };

  describe("GET", () => {
    test("returns 200 with herd labels when species beef", async () => {
      getSessionData.mockReturnValue({
        reference: "TEMP-6GSE-PIR8",
        typeOfReview: "REVIEW",
        typeOfLivestock: "beef",
        herds: [
          {
            id: "1",
          },
        ],
      });

      const res = await server.inject({ method: "GET", url, auth });

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      expect($(".govuk-back-link").attr("href")).toContain("/select-the-herd");
      expectHerdText($);
      expectPhaseBanner.ok($);
    });

    test("returns 200 with herd labels when species beef, also correct herd name", async () => {
      getSessionData.mockReturnValue({
        reference: "TEMP-6GSE-PIR8",
        typeOfReview: "REVIEW",
        typeOfLivestock: "beef",
        herdName: "Commercial Herd",
        herds: [
          {
            id: "1",
          },
        ],
      });

      const res = await server.inject({ method: "GET", url, auth });

      expect(res.statusCode).toBe(200);

      const $ = cheerio.load(res.payload);
      expect($(".govuk-back-link").attr("href")).toContain("/select-the-herd");
      expectHerdText($);
      expectPhaseBanner.ok($);
    });

    test("returns 200 with flock labels when species sheep", async () => {
      getSessionData.mockReturnValue({
        reference: "TEMP-6GSE-PIR8",
        typeOfReview: "REVIEW",
        typeOfLivestock: "sheep",
        herds: [
          {
            id: "1",
          },
        ],
      });

      const res = await server.inject({ method: "GET", url, auth });

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      expect($(".govuk-back-link").attr("href")).toContain("/select-the-herd");
      expectFlockText($);
      expectPhaseBanner.ok($);
    });

    test("returns 200 with back link to date of visit when no previous herds", async () => {
      getSessionData.mockReturnValue({
        reference: "TEMP-6GSE-PIR8",
        typeOfReview: "REVIEW",
        typeOfLivestock: "sheep",
        herds: [],
      });

      const res = await server.inject({ method: "GET", url, auth });

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      expect($(".govuk-back-link").attr("href")).toContain("/date-of-visit");
      expectFlockText($);
      expectPhaseBanner.ok($);
    });
  });

  describe("POST", () => {
    beforeAll(async () => {
      crumb = await getCrumbs(server);
    });

    test("navigates to the correct page when payload valid", async () => {
      getSessionData.mockReturnValue({
        reference: "TEMP-6GSE-PIR8",
        typeOfReview: "REVIEW",
        typeOfLivestock: "sheep",
      });

      const res = await server.inject({
        method: "POST",
        url,
        auth,
        payload: { crumb, herdName: "    Commercial Herd    " },
        headers: { cookie: `crumb=${crumb}` },
      });

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toEqual("/enter-cph-number");
      expect(setSessionData).toHaveBeenCalled();
      expect(emitHerdEvent).toHaveBeenCalled();
    });

    test("navigates to the correct page when payload valid and multiple previous claims with herds", async () => {
      getSessionData.mockReturnValue({
        reference: "TEMP-6GSE-PIR8",
        typeOfReview: "REVIEW",
        typeOfLivestock: "sheep",
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
      expect(res.headers.location).toEqual("/enter-cph-number");
      expect(setSessionData).toHaveBeenCalled();
      expect(emitHerdEvent).toHaveBeenCalled();
    });

    test("displays errors when herd name is missing", async () => {
      getSessionData.mockReturnValue({
        reference: "TEMP-6GSE-PIR8",
        typeOfReview: "REVIEW",
        typeOfLivestock: "beef",
        herds: [{ id: 1 }],
      });

      const res = await server.inject({
        method: "POST",
        url,
        auth,
        payload: { crumb },
        headers: { cookie: `crumb=${crumb}` },
      });

      const $ = cheerio.load(res.payload);
      expect(res.statusCode).toBe(400);
      expect($("h2.govuk-error-summary__title").text()).toContain("There is a problem");
      expect($('a[href="#herdName"]').text()).toContain("Enter the herd name");
      expect($(".govuk-back-link").attr("href")).toContain("/select-the-herd");
      expectHerdText($);
      expect(emitHerdEvent).not.toHaveBeenCalled();
    });

    test("displays errors when herd name is less than 2 characters", async () => {
      getSessionData.mockReturnValue({
        reference: "TEMP-6GSE-PIR8",
        typeOfReview: "REVIEW",
        typeOfLivestock: "beef",
        herds: [{ id: 1 }],
      });

      const res = await server.inject({
        method: "POST",
        url,
        auth,
        payload: { crumb, herdName: "a" },
        headers: { cookie: `crumb=${crumb}` },
      });

      const $ = cheerio.load(res.payload);
      expect(res.statusCode).toBe(400);
      expect($("h2.govuk-error-summary__title").text()).toContain("There is a problem");
      expect($('a[href="#herdName"]').text()).toContain("Name must be between 2 and 30 characters");
      expect($(".govuk-back-link").attr("href")).toContain("/select-the-herd");
      expectHerdText($);
      expect(emitHerdEvent).not.toHaveBeenCalled();
    });

    test("displays errors when herd name is greater than 30 characters", async () => {
      getSessionData.mockReturnValue({
        reference: "TEMP-6GSE-PIR8",
        typeOfReview: "REVIEW",
        typeOfLivestock: "beef",
        herds: [{ id: 1 }],
      });

      const res = await server.inject({
        method: "POST",
        url,
        auth,
        payload: { crumb, herdName: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
        headers: { cookie: `crumb=${crumb}` },
      });

      const $ = cheerio.load(res.payload);
      expect(res.statusCode).toBe(400);
      expect($("h2.govuk-error-summary__title").text()).toContain("There is a problem");
      expect($('a[href="#herdName"]').text()).toContain("Name must be between 2 and 30 characters");
      expect($(".govuk-back-link").attr("href")).toContain("/select-the-herd");
      expectHerdText($);
      expect(emitHerdEvent).not.toHaveBeenCalled();
    });

    test("displays errors when herd name contains an invalid character", async () => {
      getSessionData.mockReturnValue({
        reference: "TEMP-6GSE-PIR8",
        typeOfReview: "REVIEW",
        typeOfLivestock: "beef",
        herds: [{ id: 1 }],
      });

      const res = await server.inject({
        method: "POST",
        url,
        auth,
        payload: { crumb, herdName: "abc$" },
        headers: { cookie: `crumb=${crumb}` },
      });

      const $ = cheerio.load(res.payload);
      expect(res.statusCode).toBe(400);
      expect($("h2.govuk-error-summary__title").text()).toContain("There is a problem");
      expect($('a[href="#herdName"]').text()).toContain(
        "Name must only include letters a to z, numbers and special characters such as hyphens, spaces and apostrophes.",
      );
      expect($(".govuk-back-link").attr("href")).toContain("/select-the-herd");
      expectHerdText($);
      expect(emitHerdEvent).not.toHaveBeenCalled();
    });

    test("displays errors when herd name has already been used in a previous claim", async () => {
      getSessionData.mockReturnValue({
        reference: "TEMP-6GSE-PIR8",
        typeOfReview: "REVIEW",
        typeOfLivestock: "beef",
        herds: [{ id: 1 }],
        previousClaims: [
          {
            herd: {
              name: "Commercial Herd",
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

      const $ = cheerio.load(res.payload);
      expect(res.statusCode).toBe(400);
      expect($("h2.govuk-error-summary__title").text()).toContain("There is a problem");
      expect($('a[href="#herdName"]').text()).toContain(
        "You have already used this name, the name must be unique",
      );
      expect($(".govuk-back-link").attr("href")).toContain("/select-the-herd");
      expectHerdText($);
      expect(emitHerdEvent).not.toHaveBeenCalled();
    });

    test("displays errors with back link to date of visit when no previous herds and sheep", async () => {
      getSessionData.mockReturnValue({
        reference: "TEMP-6GSE-PIR8",
        typeOfReview: "REVIEW",
        typeOfLivestock: "sheep",
      });

      const res = await server.inject({
        method: "POST",
        url,
        auth,
        payload: { crumb },
        headers: { cookie: `crumb=${crumb}` },
      });

      const $ = cheerio.load(res.payload);
      expect(res.statusCode).toBe(400);
      expect($("h2.govuk-error-summary__title").text()).toContain("There is a problem");
      expect($('a[href="#herdName"]').text()).toContain("Enter the flock name");
      expect($(".govuk-back-link").attr("href")).toContain("/date-of-visit");
      expectFlockText($);
      expect(emitHerdEvent).not.toHaveBeenCalled();
    });
  });
});

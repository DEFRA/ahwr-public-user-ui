import * as cheerio from "cheerio";
import { createServer } from "../../../../../app/server.js";
import expectPhaseBanner from "assert";
import { getCrumbs } from "../../../../utils/get-crumbs.js";
import {
  getSessionData,
  sessionEntryKeys,
  sessionKeys,
  setSessionData,
} from "../../../../../app/session/index.js";
import { when } from "jest-when";

jest.mock("../../../../../app/session/index.js");

describe("Test Results test", () => {
  const auth = { credentials: {}, strategy: "cookie" };
  const url = "/vet-visits-review-test-results";
  let server;

  beforeAll(async () => {
    setSessionData.mockImplementation(() => {});
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
      .mockReturnValue({
        typeOfLivestock: "beef",
        reference: "TEMP-6GSE-PIR8",
      });

    server = await createServer();
    await server.initialize();

    when(getSessionData)
      .calledWith(
        expect.anything(),
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.latestEndemicsApplication,
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

  afterAll(async () => {
    jest.resetAllMocks();
    await server.stop();
  });

  describe(`GET ${url} route`, () => {
    test("returns 200", async () => {
      const options = {
        method: "GET",
        url,
        auth,
      };

      const res = await server.inject(options);
      const $ = cheerio.load(res.payload);

      expect(res.statusCode).toBe(200);
      expect($("legend").text()).toMatch(
        "What was the test result of your last animal health and welfare review?",
      );
      expect($("title").text()).toContain(
        "Vet Visits Review Test Results - Get funding to improve animal health and welfare",
      );

      expectPhaseBanner.ok($);
    });

    test.each([
      { typeOfLivestock: "beef", backlink: "/which-type-of-review" },
      { typeOfLivestock: "dairy", backlink: "/which-type-of-review" },
      { typeOfLivestock: "sheep", backlink: "/vet-rcvs" },
      { typeOfLivestock: "pig", backlink: "/vet-rcvs" },
    ])("backLink test", async ({ typeOfLivestock, backlink }) => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
        .mockReturnValue({
          typeOfLivestock,
          reference: "TEMP-6GSE-PIR8",
        });
      const options = {
        method: "GET",
        url,
        auth,
      };

      const res = await server.inject(options);
      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      expect($(".govuk-back-link").attr("href")).toContain(backlink);
      expectPhaseBanner.ok($);
    });

    test("when not logged in redirects to /sign-in", async () => {
      const options = {
        method: "GET",
        url,
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location.toString()).toEqual(`/sign-in`);
    });
  });
  describe(`POST ${url} route`, () => {
    let crumb;

    beforeEach(async () => {
      crumb = await getCrumbs(server);
    });

    test("when not logged in redirects to /sign-in", async () => {
      const options = {
        method: "POST",
        url,
        payload: { crumb, testResults: "positive" },
        headers: { cookie: `crumb=${crumb}` },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location.toString()).toEqual(`/sign-in`);
    });

    test.each([
      { typeOfLivestock: "beef", nextPageURL: "/date-of-visit" },
      { typeOfLivestock: "pigs", nextPageURL: "/vaccination" },
    ])(
      "Redirect $nextPageURL When species $typeOfLivestock",
      async ({ typeOfLivestock, nextPageURL }) => {
        getSessionData.mockImplementation(() => {
          return { typeOfLivestock };
        });

        const options = {
          method: "POST",
          url,
          auth,
          payload: { crumb, vetVisitsReviewTestResults: "positive" },
          headers: { cookie: `crumb=${crumb}` },
        };

        const res = await server.inject(options);

        expect(res.statusCode).toBe(302);
        expect(res.headers.location.toString()).toEqual(expect.stringContaining(nextPageURL));
        expect(setSessionData).toHaveBeenCalled();
      },
    );

    test("shows error when payload is invalid", async () => {
      const options = {
        method: "POST",
        url,
        auth,
        payload: { crumb, vetVisitsReviewTestResults: undefined },
        headers: { cookie: `crumb=${crumb}` },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(400);
      const $ = cheerio.load(res.payload);
      expect($("legend").text()).toMatch("What was the review test result?");
      expect($("#main-content > div > div > div > div > div > ul > li > a").text()).toMatch(
        "Select a test result",
      );
      expect($("#vetVisitsReviewTestResults-error").text()).toMatch("Select a test result");
    });
  });
});

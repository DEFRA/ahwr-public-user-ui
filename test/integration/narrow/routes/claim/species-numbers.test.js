import * as cheerio from "cheerio";
import { createServer } from "../../../../../app/server.js";
import expectPhaseBanner from "assert";
import { getCrumbs } from "../../../../utils/get-crumbs.js";
import { getSpeciesEligibleNumberForDisplay } from "../../../../../app/lib/display-helpers.js";
import {
  isMultipleHerdsUserJourney,
  isVisitDateAfterPIHuntAndDairyGoLive,
} from "../../../../../app/lib/context-helper.js";
import { StatusCodes } from "http-status-codes";
import { getSessionData, setSessionData } from "../../../../../app/session/index.js";
import { sendInvalidDataEvent } from "../../../../../app/messaging/ineligibility-event-emission.js";

jest.mock("../../../../../app/session/index.js");
jest.mock("../../../../../app/messaging/ineligibility-event-emission.js");
jest.mock("../../../../../app/lib/context-helper.js");
jest.mock("../../../../../app/lib/context-helper.js", () => ({
  ...jest.requireActual("../../../../../app/lib/context-helper.js"),
  isMultipleHerdsUserJourney: jest.fn(),
  isVisitDateAfterPIHuntAndDairyGoLive: jest.fn(),
  skipSameHerdPage: jest.fn(),
}));

const auth = { credentials: {}, strategy: "cookie" };
const url = "/species-numbers";

describe("Species numbers page", () => {
  let server;

  beforeAll(async () => {
    setSessionData.mockImplementation(() => {});
    getSessionData.mockImplementation(() => {
      return { typeOfLivestock: "beef" };
    });
    server = await createServer();
    await server.initialize();
    isVisitDateAfterPIHuntAndDairyGoLive.mockImplementation(() => {
      return false;
    });
  });

  beforeEach(async () => {
    jest.resetAllMocks();
  });

  afterAll(async () => {
    jest.resetAllMocks();
    await server.stop();
  });

  describe(`GET ${url} route`, () => {
    test.each([
      {
        typeOfLivestock: "beef",
        typeOfReview: "FOLLOW_UP",
        reviewTestResults: "negative",
        backLink: "/date-of-visit",
      },
      {
        typeOfLivestock: "dairy",
        typeOfReview: "REVIEW",
        reviewTestResults: "positive",
        backLink: "/date-of-testing",
      },
    ])(
      "returns 200 for non MH claim for $typeOfLivestock",
      async ({ typeOfLivestock, typeOfReview, reviewTestResults, backLink }) => {
        getSessionData.mockImplementation(() => {
          return {
            typeOfLivestock,
            typeOfReview,
            reviewTestResults,
            reference: "TEMP-6GSE-PIR8",
            latestEndemicsApplication: { flags: [] },
          };
        });
        const options = {
          method: "GET",
          auth,
          url,
        };

        const res = await server.inject(options);
        const $ = cheerio.load(res.payload);

        expect(res.statusCode).toBe(200);
        expect($(".govuk-fieldset__heading").text().trim()).toEqual(
          `Did you have 11 or more ${typeOfLivestock} cattle  on the date of the ${typeOfReview === "REVIEW" ? "review" : "follow-up"}?`,
        );
        expect($("title").text().trim()).toContain(
          `Did you have 11 or more ${typeOfLivestock} cattle  on the date of the ${typeOfReview === "REVIEW" ? "review" : "follow-up"}? - Get funding to improve animal health and welfare`,
        );
        expect($(".govuk-hint").text().trim()).toEqual(
          "You can find this on the summary the vet gave you.",
        );
        expect($(".govuk-radios__item").length).toEqual(2);
        expect($(".govuk-back-link").attr("href")).toEqual(backLink);
        expectPhaseBanner.ok($);
      },
    );

    test.each([
      { typeOfLivestock: "beef", typeOfReview: "FOLLOW_UP", reviewTestResults: "negative" },
      { typeOfLivestock: "dairy", typeOfReview: "REVIEW", reviewTestResults: "positive" },
    ])(
      "returns 200 for multi herds claim for $typeOfLivestock - $typeOfReview",
      async ({ typeOfLivestock, typeOfReview, reviewTestResults }) => {
        isMultipleHerdsUserJourney.mockReturnValue(true);
        getSessionData.mockImplementation(() => ({
          typeOfLivestock,
          typeOfReview,
          reviewTestResults,
          reference: "TEMP-6GSE-PIR8",
          latestEndemicsApplication: { flags: [] },
          previousClaims: [{ data: { typeOfLivestock } }],
        }));
        const options = {
          method: "GET",
          auth,
          url,
        };

        const res = await server.inject(options);
        const $ = cheerio.load(res.payload);

        expect(res.statusCode).toBe(200);
        expect($(".govuk-fieldset__heading").text().trim()).toEqual(
          `Did you have 11 or more ${typeOfLivestock} cattle in this herd on the date of the ${typeOfReview === "REVIEW" ? "review" : "follow-up"}?`,
        );
        expect($("title").text().trim()).toContain(
          `Did you have 11 or more ${typeOfLivestock} cattle in this herd on the date of the ${typeOfReview === "REVIEW" ? "review" : "follow-up"}? - Get funding to improve animal health and welfare`,
        );
        expect($(".govuk-hint").text().trim()).toEqual(
          "You can find this on the summary the vet gave you.",
        );
        expect($(".govuk-radios__item").length).toEqual(2);
        expect($(".govuk-back-link").attr("href")).toEqual("/same-herd");
        expectPhaseBanner.ok($);
      },
    );

    test("returns 200 for multi herds claim for sheep", async () => {
      isMultipleHerdsUserJourney.mockReturnValue(true);
      getSessionData.mockImplementation(() => ({
        typeOfLivestock: "sheep",
        typeOfReview: "REVIEW",
        reviewTestResults: "negative",
        reference: "TEMP-6GSE-PIR8",
        latestEndemicsApplication: { flags: [] },
        previousClaims: [{ data: { typeOfLivestock: "sheep" } }],
      }));
      const options = {
        method: "GET",
        auth,
        url,
      };

      const res = await server.inject(options);
      const $ = cheerio.load(res.payload);

      expect(res.statusCode).toBe(200);
      expect($(".govuk-fieldset__heading").text().trim()).toEqual(
        "Did you have 21 or more sheep in this flock on the date of the review?",
      );
      expect($("title").text().trim()).toContain(
        "Did you have 21 or more sheep in this flock on the date of the review? - Get funding to improve animal health and welfare",
      );
      expect($(".govuk-hint").text().trim()).toEqual(
        "You can find this on the summary the vet gave you.",
      );
      expect($(".govuk-radios__item").length).toEqual(2);
      expectPhaseBanner.ok($);
    });

    test("returns 500 when there is no claim", async () => {
      getSessionData.mockReturnValueOnce({});
      getSessionData.mockReturnValueOnce({ reference: "TEMP-6GSE-PIR8" });
      getSessionData.mockReturnValue(undefined);
      const options = {
        auth,
        method: "GET",
        url,
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
      const $ = cheerio.load(res.payload);
      expect($(".govuk-heading-l").text()).toEqual("Sorry, there is a problem with the service");
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
        payload: { crumb, laboratoryURN: "123" },
        headers: { cookie: `crumb=${crumb}` },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location.toString()).toEqual(`/sign-in`);
    });

    test.each([
      { typeOfLivestock: "beef", nextPageUrl: "/number-of-species-tested" },
      { typeOfLivestock: "dairy", nextPageUrl: "/vet-name" },
      { typeOfLivestock: "sheep", nextPageUrl: "/number-of-species-tested" },
      { typeOfLivestock: "pigs", nextPageUrl: "/number-of-species-tested" },
      {
        typeOfLivestock: "beef",
        nextPageUrl: "/vet-name",
        typeOfReview: "FOLLOW_UP",
        reviewTestResults: "negative",
      },
    ])(
      "redirects to check answers page when payload is valid for $typeOfLivestock",
      async ({ nextPageUrl, typeOfLivestock, typeOfReview, reviewTestResults }) => {
        getSessionData
          .mockImplementationOnce(() => {
            return { typeOfLivestock, typeOfReview, reviewTestResults };
          })
          .mockImplementationOnce(() => {
            return { typeOfLivestock, typeOfReview, reviewTestResults };
          });
        const options = {
          method: "POST",
          url,
          auth,
          payload: { crumb, speciesNumbers: "yes" },
          headers: { cookie: `crumb=${crumb}` },
        };

        const res = await server.inject(options);

        expect(res.statusCode).toBe(302);
        expect(res.headers.location.toString()).toEqual(expect.stringContaining(nextPageUrl));
        expect(setSessionData).toHaveBeenCalled();
      },
    );

    test("Continue to eligible page if user selects yes", async () => {
      const options = {
        method: "POST",
        payload: { crumb, speciesNumbers: "yes" },
        auth,
        url,
        headers: { cookie: `crumb=${crumb}` },
      };

      getSessionData
        .mockImplementationOnce(() => {
          return { typeOfLivestock: "beef" };
        })
        .mockImplementationOnce(() => {
          return { typeOfLivestock: "beef" };
        });

      const res = await server.inject(options);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toEqual("/number-of-species-tested");
    });
    test("Continue to ineligible page if user selects no", async () => {
      const options = {
        method: "POST",
        payload: { crumb, speciesNumbers: "no" },
        auth,
        url,
        headers: { cookie: `crumb=${crumb}` },
      };
      getSessionData
        .mockImplementationOnce(() => {
          return { typeOfLivestock: "beef" };
        })
        .mockImplementationOnce(() => {
          return { typeOfLivestock: "beef" };
        });

      const res = await server.inject(options);

      expect(res.statusCode).toBe(400);
      const $ = cheerio.load(res.payload);
      expect($("h1").text()).toMatch("You cannot continue with your claim");
      expect(sendInvalidDataEvent).toHaveBeenCalled();
    });
    test("shows error when payload is invalid", async () => {
      getSessionData.mockImplementation(() => {
        return {
          typeOfLivestock: "beef",
          reviewTestResults: "positive",
          latestEndemicsApplication: { flags: [] },
        };
      });
      const options = {
        method: "POST",
        url,
        auth,
        payload: { crumb, speciesNumbers: undefined },
        headers: { cookie: `crumb=${crumb}` },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(400);
      const $ = cheerio.load(res.payload);
      expect($("h1").text().trim()).toMatch(
        `Did you have ${getSpeciesEligibleNumberForDisplay({ typeOfLivestock: "beef" }, true)} on the date of the follow-up?`,
      );
      expect($("#main-content > div > div > div > div > div > ul > li > a").text()).toMatch(
        `Select yes if you had ${getSpeciesEligibleNumberForDisplay({ typeOfLivestock: "beef" }, true)} on the date of the follow-up`,
      );
      expect($(".govuk-back-link").attr("href")).toEqual("/date-of-testing");
    });

    test("shows error when payload is invalid for multi herds claim", async () => {
      isMultipleHerdsUserJourney.mockReturnValue(true);
      getSessionData.mockImplementation(() => ({
        typeOfLivestock: "beef",
        reviewTestResults: "positive",
        latestEndemicsApplication: { flags: [] },
        previousClaims: [{ data: { typeOfLivestock: "beef" } }],
      }));
      const options = {
        method: "POST",
        url,
        auth,
        payload: { crumb, speciesNumbers: undefined },
        headers: { cookie: `crumb=${crumb}` },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(400);
      const $ = cheerio.load(res.payload);
      expect($("h1").text().trim()).toMatch(
        `Did you have ${getSpeciesEligibleNumberForDisplay({ typeOfLivestock: "beef" }, true)}in this herd on the date of the follow-up?`,
      );
      expect($("#main-content > div > div > div > div > div > ul > li > a").text()).toMatch(
        `Select yes if you had ${getSpeciesEligibleNumberForDisplay({ typeOfLivestock: "beef" }, true)}in this herd on the date of the follow-up`,
      );
      expect($(".govuk-back-link").attr("href")).toEqual("/same-herd");
    });

    test("redirect the user to 500 page in fail action and no claim object", async () => {
      const options = {
        method: "POST",
        url,
        auth,
        payload: { crumb, speciesNumbers: undefined },
        headers: { cookie: `crumb=${crumb}` },
      };
      getSessionData.mockReturnValue(undefined);

      const res = await server.inject(options);

      expect(res.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
      const $ = cheerio.load(res.payload);
      expect($("h1").text().trim()).toMatch("Sorry, there is a problem with the service");
    });
  });
});

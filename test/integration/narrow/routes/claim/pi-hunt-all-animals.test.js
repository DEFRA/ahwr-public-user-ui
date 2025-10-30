import * as cheerio from 'cheerio'
import { createServer } from '../../../../../app/server.js'
import {
  getSessionData,
  sessionEntryKeys,
  setSessionData,
} from "../../../../../app/session/index.js";
import expectPhaseBanner from "assert";
import { getCrumbs } from "../../../../utils/get-crumbs.js";
import { getAmount } from "ffc-ahwr-common-library";
import { when } from "jest-when";

jest.mock("../../../../../app/session/index.js");
jest.mock("ffc-ahwr-common-library");

const auth = { credentials: {}, strategy: "cookie" };
const url = "/pi-hunt-all-animals";

describe("PI Hunt recommended tests", () => {
  let server;

  beforeAll(async () => {
    server = await createServer();
    await server.initialize();
  });

  afterAll(async () => {
    await server.stop();
    jest.resetAllMocks();
  });

  describe(`GET ${url} route`, () => {
    test.each([
      {
        typeOfLivestock: "beef",
        reviewTestResults: "positive",
        backLink: "/pi-hunt",
        expectedQuestion: "Was the PI hunt done on all beef cattle in the herd?",
      },
      {
        typeOfLivestock: "dairy",
        reviewTestResults: "negative",
        backLink: "/pi-hunt-recommended",
        expectedQuestion: "Was the PI hunt done on all dairy cattle in the herd?",
      },
    ])(
      "returns 200",
      async ({ typeOfLivestock, reviewTestResults, backLink, expectedQuestion }) => {
        when(getSessionData)
          .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
          .mockReturnValueOnce({ typeOfLivestock, reviewTestResults });

        const options = {
          method: "GET",
          auth,
          url,
        };

        const res = await server.inject(options);
        const $ = cheerio.load(res.payload);

        expect(res.statusCode).toBe(200);
        expect($(".govuk-fieldset__heading").text().trim()).toEqual(expectedQuestion);
        expect($(".govuk-radios__item").length).toEqual(2);
        expect($(".govuk-back-link").attr("href")).toContain(backLink);
        expectPhaseBanner.ok($);
      },
    );

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
        payload: { crumb },
        headers: { cookie: `crumb=${crumb}` },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location.toString()).toEqual(`/sign-in`);
    });
    test("Continue to eligible page if user select yes", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
        .mockReturnValueOnce({ typeOfLivestock: "beef" });

      const options = {
        method: "POST",
        payload: { crumb, piHuntAllAnimals: "yes" },
        auth,
        url,
        headers: { cookie: `crumb=${crumb}` },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toEqual("/date-of-testing");
      expect(setSessionData).toHaveBeenCalled();
    });

    test("Continue to ineligible page if user select no and show correct content with negative review test result", async () => {
      getSessionData.mockImplementationOnce(() => {
        return { typeOfLivestock: "beef", reviewTestResults: "negative" };
      });

      const options = {
        method: "POST",
        payload: { crumb, piHuntAllAnimals: "no" },
        auth,
        url,
        headers: { cookie: `crumb=${crumb}` },
      };

      getAmount.mockResolvedValue(215);
      const res = await server.inject(options);

      expect(res.statusCode).toBe(400);
      const $ = cheerio.load(res.payload);
      expect($(".govuk-heading-l").text()).toMatch("There could be a problem with your claim");
    });

    test("Continue to ineligible page if user selects no and show correct content with positive review test result", async () => {
      getSessionData.mockImplementationOnce(() => {
        return { typeOfLivestock: "beef", reviewTestResults: "positive" };
      });

      const options = {
        method: "POST",
        payload: { crumb, piHuntAllAnimals: "no" },
        auth,
        url,
        headers: { cookie: `crumb=${crumb}` },
      };

      getAmount.mockResolvedValue(215);
      const res = await server.inject(options);

      expect(res.statusCode).toBe(400);
      const $ = cheerio.load(res.payload);
      expect($(".govuk-heading-l").text()).toMatch("You cannot continue with your claim");
    });

    test("shows error when payload is invalid", async () => {
      getSessionData
        .mockImplementationOnce(() => {
          return { typeOfLivestock: "beef" };
        })
        .mockImplementationOnce(() => {
          return { typeOfLivestock: "beef" };
        });

      const options = {
        method: "POST",
        url,
        auth,
        payload: { crumb, piHuntAllAnimals: undefined },
        headers: { cookie: `crumb=${crumb}` },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(400);
      const $ = cheerio.load(res.payload);
      expect($(".govuk-fieldset__heading").text().trim()).toEqual(
        "Was the PI hunt done on all beef cattle in the herd?",
      );
      expect($("#main-content > div > div > div > div > div > ul > li > a").text()).toMatch(
        "Select yes if the PI hunt was done on all beef cattle in the herd",
      );
    });
  });
});

import * as cheerio from "cheerio";
import { createServer } from "../../../../../../app/server.js";
import expectPhaseBanner from "assert";
import { getCrumbs } from "../../../../../utils/get-crumbs.js";
import {
  getSessionData,
  sessionEntryKeys,
  sessionKeys,
  setSessionData,
} from "../../../../../../app/session/index.js";
import { when } from "jest-when";
import {
  testBrowserPageTitle,
  testPageHeading,
} from "../../../../../helpers/page-title-and-heading.js";
import { testRedirectsToSignInWhenLoggedOut } from "../../../../../helpers/sign-in-redirect.js";

const errorMessages = {
  enterName: "Enter the vet's name",
  nameLength: "The vet's name must be 50 characters or less",
  namePattern:
    "The vet's name must only include letters a to z, numbers and special characters such as hyphens, spaces, apostrophes, ampersands, commas, brackets or a forward slash",
};

jest.mock("../../../../../../app/session/index.js");

describe("Vet name test", () => {
  const auth = { credentials: {}, strategy: "cookie" };
  const url = "/livestock/vet-name";
  let server;

  beforeAll(async () => {
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
      .mockReturnValue({ typeOfLivestock: "pigs" });

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

    when(getSessionData)
      .calledWith(
        expect.anything(),
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.reference,
      )
      .mockReturnValue("IAHW-1LZ5-ELVQ");

    setSessionData.mockImplementation(() => {});

    server = await createServer();
    await server.initialize();
  });

  afterAll(async () => {
    await server.stop();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe(`GET ${url} route`, () => {
    const getResponse = () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
        .mockReturnValue({
          typeOfLivestock: "beef",
          typeOfReview: "FOLLOW_UP",
          reference: "TEMP-6GSE-PIR8",
        });
      return server.inject({ method: "GET", url, auth });
    };

    testBrowserPageTitle({ title: "Livestock vet's name", getResponse });
    testPageHeading({ heading: "What is the vet's name?", getResponse });

    test.each([{ reviewTestResults: "negative" }, { reviewTestResults: "positive" }])(
      "returns 200",
      async ({ reviewTestResults }) => {
        when(getSessionData)
          .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
          .mockReturnValue({
            typeOfLivestock: "beef",
            typeOfReview: "FOLLOW_UP",
            reviewTestResults,
            reference: "TEMP-6GSE-PIR8",
          });

        const res = await server.inject({ method: "GET", url, auth });

        expect(res.statusCode).toBe(200);
        const $ = cheerio.load(res.payload);
        expectPhaseBanner.ok($);
      },
    );

    testRedirectsToSignInWhenLoggedOut({
      getResponse: () => server.inject({ method: "GET", url }),
    });
  });

  describe(`POST ${url} route`, () => {
    let crumb;

    beforeEach(async () => {
      crumb = await getCrumbs(server);
    });

    testRedirectsToSignInWhenLoggedOut({
      getResponse: () =>
        server.inject({
          method: "POST",
          url,
          payload: { crumb, numberAnimalsTested: "123" },
          headers: { cookie: `crumb=${crumb}` },
        }),
    });
    test.each([
      { vetsName: "", error: errorMessages.enterName },
      {
        vetsName: "dfdddfdf6697979779779dfdddfdf669797977977955444556655",
        error: errorMessages.nameLength,
      },
      { vetsName: "****", error: errorMessages.namePattern },
    ])("show error message when the vet name is not valid", async ({ vetsName, error }) => {
      const options = {
        method: "POST",
        url,
        auth,
        payload: { crumb, vetsName },
        headers: { cookie: `crumb=${crumb}` },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(400);
      const $ = cheerio.load(res.payload);
      expect($("h1").text()).toMatch("What is the vet's name?");
      expect($("#main-content > div > div > div > div > div > ul > li > a").text()).toMatch(error);
      expect($("#vetsName-error").text()).toMatch(error);
    });
    test.each([{ vetsName: "Adam" }, { vetsName: "(Sarah)" }, { vetsName: "Kevin&&" }])(
      "Continue to vet rvs screen if the vet name is valid",
      async ({ vetsName }) => {
        const options = {
          method: "POST",
          url,
          auth,
          payload: { crumb, vetsName },
          headers: { cookie: `crumb=${crumb}` },
        };

        const res = await server.inject(options);

        expect(res.statusCode).toBe(302);
        expect(res.headers.location).toEqual("/livestock/vet-rcvs");
        expect(setSessionData).toHaveBeenCalledTimes(1);
        expect(setSessionData).toHaveBeenCalledWith(
          res.request,
          "endemicsClaim",
          "vetsName",
          vetsName,
        );
      },
    );
  });
});

import * as cheerio from "cheerio";
import { createServer } from "../../../../../../app/server.js";
import {
  getSessionData,
  sessionEntryKeys,
  sessionKeys,
  setSessionData,
} from "../../../../../../app/session/index.js";
import expectPhaseBanner from "assert";
import { getCrumbs } from "../../../../../utils/get-crumbs.js";
import { sendInvalidDataEvent } from "../../../../../../app/messaging/ineligibility-event-emission.js";
import { when } from "jest-when";
import {
  testBrowserPageTitle,
  testPageHeading,
} from "../../../../../helpers/page-title-and-heading.js";
import { testRedirectsToSignInWhenLoggedOut } from "../../../../../helpers/sign-in-redirect.js";

jest.mock("../../../../../../app/messaging/ineligibility-event-emission.js");
jest.mock("../../../../../../app/session/index.js");

const auth = { credentials: {}, strategy: "cookie" };
const url = "/livestock/number-of-samples-tested";

describe("Number of samples tested test", () => {
  let server;

  beforeAll(async () => {
    setSessionData.mockImplementation(() => {});
    getSessionData.mockImplementation(() => {
      return { typeOfLivestock: "pigs", reference: "TEMP-6GSE-PIR8" };
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

    when(getSessionData)
      .calledWith(
        expect.anything(),
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.reference,
      )
      .mockReturnValue("IAHW-1LZ5-ELVQ");
  });

  afterAll(async () => {
    await server.stop();
    jest.resetAllMocks();
  });

  describe(`GET ${url} route`, () => {
    const getResponse = () => server.inject({ method: "GET", url, auth });

    testBrowserPageTitle({ title: "Number of livestock samples tested", getResponse });
    testPageHeading({ heading: "How many samples were tested?", getResponse });

    test("returns 200 and expected content", async () => {
      const res = await getResponse();

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      expect($(".govuk-hint").text().trim()).toEqual(
        "Enter how many polymerase chain reaction (PCR) and enzyme-linked immunosorbent assay (ELISA) test results you got back. You can find this on the summary the vet gave you.",
      );

      expectPhaseBanner.ok($);
    });

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
          payload: { crumb, numberOfSamplesTested: "123" },
          headers: { cookie: `crumb=${crumb}` },
        }),
    });

    test.each([
      {
        scenario: "payload is empty",
        numberOfSamplesTested: "",
        error:
          "Error: Enter how many samples were tested. Use the number of PCR or ELISA test results you got back",
      },
      {
        scenario: "payload is of invalid type",
        numberOfSamplesTested: "seven",
        error:
          "Error: The amount of samples tested must only include numbers. Use the number of PCR or ELISA test results you got back",
      },
      {
        scenario: "payload number is too high",
        numberOfSamplesTested: "10000000",
        error:
          "Error: The number of samples tested should not exceed 9999. Use the number of PCR or ELISA test results you got back",
      },
    ])("shows error when $scenario", async ({ numberOfSamplesTested, error }) => {
      const options = {
        method: "POST",
        url,
        auth,
        payload: { crumb, numberOfSamplesTested },
        headers: { cookie: `crumb=${crumb}` },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(400);
      const $ = cheerio.load(res.payload);
      expect($("h1").text()).toMatch("How many samples were tested?");
      expect($("#numberOfSamplesTested-error").text().trim()).toEqual(error);
    });

    test.each([
      { numberOfSamplesTested: "5", lastReviewTestResults: "positive" },
      { numberOfSamplesTested: "7", lastReviewTestResults: "positive" },
      { numberOfSamplesTested: "0", lastReviewTestResults: "positive" },
      { numberOfSamplesTested: "9999", lastReviewTestResults: "positive" },
      { numberOfSamplesTested: "29", lastReviewTestResults: "negative" },
      { numberOfSamplesTested: "31", lastReviewTestResults: "negative" },
      { numberOfSamplesTested: "0", lastReviewTestResults: "negative" },
      { numberOfSamplesTested: "9999", lastReviewTestResults: "negative" },
    ])(
      "redirects to exception page if $numberOfSamplesTested and $lastReviewTestResults dont match validation",
      async ({ numberOfSamplesTested, lastReviewTestResults }) => {
        getSessionData.mockImplementation(() => {
          return { vetVisitsReviewTestResults: lastReviewTestResults };
        });

        const options = {
          method: "POST",
          url,
          auth,
          payload: { crumb, numberOfSamplesTested },
          headers: { cookie: `crumb=${crumb}` },
        };

        const res = await server.inject(options);

        expect(res.statusCode).toBe(400);
        const $ = cheerio.load(res.payload);
        expect($("h1").text()).toMatch("You cannot continue with your claim");
        expect(sendInvalidDataEvent).toHaveBeenCalled();
      },
    );

    test.each([
      {
        screen: "PCR",
        numberOfSamplesTested: "6",
        lastReviewTestResults: "positive",
        vaccinatedValue: "notvaccinated",
        expectedLocation: "/livestock/pigs-pcr-result",
      },
      {
        screen: "ELISA",
        numberOfSamplesTested: "30",
        lastReviewTestResults: "negative",
        vaccinatedValue: "notvaccinated",
        expectedLocation: "/livestock/pigs-elisa-result",
      },
      {
        screen: "PCR",
        numberOfSamplesTested: "6",
        lastReviewTestResults: "positive",
        vaccinatedValue: "vaccinated",
        expectedLocation: "/livestock/pigs-pcr-result",
      },
    ])(
      "redirects to $screen page if valid sample numbers, $vaccinatedValue and $lastReviewTestResults",
      async ({
        _screen,
        numberOfSamplesTested,
        lastReviewTestResults,
        vaccinatedValue,
        expectedLocation,
      }) => {
        getSessionData.mockImplementation(() => {
          return {
            vetVisitsReviewTestResults: lastReviewTestResults,
            herdVaccinationStatus: vaccinatedValue,
          };
        });

        const options = {
          method: "POST",
          url,
          auth,
          payload: { crumb, numberOfSamplesTested },
          headers: { cookie: `crumb=${crumb}` },
        };

        const res = await server.inject(options);

        expect(res.statusCode).toBe(302);
        expect(res.headers.location.toString()).toEqual(expectedLocation);
        expect(setSessionData).toHaveBeenCalled();
      },
    );
  });
});

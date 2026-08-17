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
import { isVisitDateAfterPIHuntAndDairyGoLive } from "../../../../../../app/lib/context-helper.js";
import { clearPiHuntSessionOnChange } from "../../../../../../app/lib/clear-pi-hunt-session-on-change.js";
import { sendInvalidDataEvent } from "../../../../../../app/messaging/ineligibility-event-emission.js";
import { when } from "jest-when";
import {
  testBrowserPageTitle,
  testPageHeading,
} from "../../../../../helpers/page-title-and-heading.js";
import { testRedirectsToSignInWhenLoggedOut } from "../../../../../helpers/sign-in-redirect.js";

jest.mock("../../../../../../app/session/index.js");
jest.mock("../../../../../../app/messaging/ineligibility-event-emission.js");
jest.mock("../../../../../../app/lib/context-helper.js");
jest.mock("../../../../../../app/lib/clear-pi-hunt-session-on-change.js");

const auth = { credentials: {}, strategy: "cookie" };
const url = "/livestock/pi-hunt";

describe("PI Hunt tests when Optional PI Hunt is OFF", () => {
  let server;

  beforeAll(async () => {
    server = await createServer();
    await server.initialize();

    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
      .mockReturnValue({ typeOfLivestock: "beef", reference: "TEMP-6GSE-PIR8" });

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
    isVisitDateAfterPIHuntAndDairyGoLive.mockImplementation(() => {
      return false;
    });
  });

  afterAll(async () => {
    await server.stop();
    jest.resetAllMocks();
  });

  describe(`GET ${url} route`, () => {
    const getResponse = () => server.inject({ method: "GET", auth, url });

    testBrowserPageTitle({
      title: "Persistently infected hunt for bovine viral diarrhoea done on livestock",
      getResponse,
    });
    testPageHeading({
      heading:
        "Was a persistently infected (PI) hunt for bovine viral diarrhoea (BVD) done on all animals in the herd?",
      getResponse,
    });

    test("returns 200", async () => {
      const res = await getResponse();
      const $ = cheerio.load(res.payload);

      expect(res.statusCode).toBe(200);
      expect($(".govuk-radios__item")).toHaveLength(2);
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
      jest.resetAllMocks();
    });

    testRedirectsToSignInWhenLoggedOut({
      getResponse: () =>
        server.inject({
          method: "POST",
          url,
          payload: { crumb, laboratoryURN: "123" },
          headers: { cookie: `crumb=${crumb}` },
        }),
    });
    test("Continue to eligible page if user select yes", async () => {
      const options = {
        method: "POST",
        payload: { crumb, piHunt: "yes" },
        auth,
        url,
        headers: { cookie: `crumb=${crumb}` },
      };

      getSessionData.mockImplementation(() => {
        return { typeOfLivestock: "beef" };
      });

      const res = await server.inject(options);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toEqual("/livestock/test-urn");
      expect(setSessionData).toHaveBeenCalled();
    });
    test("Continue to ineligible page if user select no and clear PI Hunt data when relevantReviewForEndemics=REVIEW", async () => {
      const options = {
        method: "POST",
        payload: { crumb, piHunt: "no" },
        auth,
        url,
        headers: { cookie: `crumb=${crumb}` },
      };
      getSessionData.mockImplementation(() => {
        return { typeOfLivestock: "beef", relevantReviewForEndemics: { type: "REVIEW" } };
      });

      const res = await server.inject(options);

      expect(res.statusCode).toBe(400);
      const $ = cheerio.load(res.payload);
      expect($("h1").text()).toMatch("You cannot continue with your claim");
      expect(sendInvalidDataEvent).toHaveBeenCalled();
      expect(clearPiHuntSessionOnChange).toHaveBeenCalled();
    });

    test("Continue to ineligible page if user select no and does not clear PI Hunt data when relevantReviewForEndemics=VV", async () => {
      const options = {
        method: "POST",
        payload: { crumb, piHunt: "no" },
        auth,
        url,
        headers: { cookie: `crumb=${crumb}` },
      };
      getSessionData.mockImplementation(() => {
        return { typeOfLivestock: "beef", relevantReviewForEndemics: { type: "VV" } };
      });

      const res = await server.inject(options);

      expect(res.statusCode).toBe(400);
      const $ = cheerio.load(res.payload);
      expect($("h1").text()).toMatch("You cannot continue with your claim");
      expect(sendInvalidDataEvent).toHaveBeenCalled();
      expect(clearPiHuntSessionOnChange).not.toHaveBeenCalled();
    });

    test("Continue to ineligible page if user select no and does not clear PI Hunt data when relevantReviewForEndemics is missing", async () => {
      const options = {
        method: "POST",
        payload: { crumb, piHunt: "no" },
        auth,
        url,
        headers: { cookie: `crumb=${crumb}` },
      };
      getSessionData.mockImplementation(() => {
        return { typeOfLivestock: "beef" };
      });

      const res = await server.inject(options);

      expect(res.statusCode).toBe(400);
      const $ = cheerio.load(res.payload);
      expect($("h1").text()).toMatch("You cannot continue with your claim");
      expect(sendInvalidDataEvent).toHaveBeenCalled();
      expect(clearPiHuntSessionOnChange).not.toHaveBeenCalled();
    });

    test("shows error when payload is invalid", async () => {
      getSessionData.mockImplementation(() => {
        return { typeOfLivestock: "beef", reviewTestResults: "positive" };
      });
      const options = {
        method: "POST",
        url,
        auth,
        payload: { crumb, piHunt: undefined },
        headers: { cookie: `crumb=${crumb}` },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(400);
      const $ = cheerio.load(res.payload);
      expect($("h1").text().trim()).toMatch(
        "Was a persistently infected (PI) hunt for bovine viral diarrhoea (BVD) done on all animals in the herd?",
      );
      expect($("#main-content > div > div > div > div > div > ul > li > a").text()).toMatch(
        "Select yes if a PI hunt was done",
      );
    });
  });
});

describe("PI Hunt tests when Optional PI Hunt is ON", () => {
  let server;

  beforeAll(async () => {
    getSessionData.mockImplementation(() => {
      return { typeOfLivestock: "beef" };
    });
    setSessionData.mockImplementation(() => {});
    server = await createServer();
    await server.initialize();
    isVisitDateAfterPIHuntAndDairyGoLive.mockImplementation(() => {
      return true;
    });
  });

  afterAll(async () => {
    jest.resetAllMocks();
    await server.stop();
  });
  describe(`POST ${url} route`, () => {
    let crumb;

    beforeEach(async () => {
      crumb = await getCrumbs(server);
    });
    test.each([
      { reviewTestResults: "positive", expectedURL: "/livestock/pi-hunt-all-animals" },
      { reviewTestResults: "negative", expectedURL: "/livestock/pi-hunt-recommended" },
    ])(
      "Continue to eligible page if user select yes",
      async ({ reviewTestResults, expectedURL }) => {
        const options = {
          method: "POST",
          payload: { crumb, piHunt: "yes" },
          auth,
          url,
          headers: { cookie: `crumb=${crumb}` },
        };

        getSessionData.mockImplementation(() => {
          return { reviewTestResults };
        });

        const res = await server.inject(options);

        expect(res.statusCode).toBe(302);
        expect(res.headers.location).toEqual(expectedURL);
        expect(setSessionData).toHaveBeenCalled();
      },
    );
    test("Continue to ineligible page if user select no", async () => {
      const options = {
        method: "POST",
        payload: { crumb, piHunt: "no" },
        auth,
        url,
        headers: { cookie: `crumb=${crumb}` },
      };
      getSessionData.mockImplementation(() => {
        return { reviewTestResults: "negative", relevantReviewForEndemics: { type: "FOLLOW_UP" } };
      });

      const res = await server.inject(options);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toEqual("/livestock/biosecurity-assessment");
      expect(sendInvalidDataEvent).toHaveBeenCalled();
    });
  });
});

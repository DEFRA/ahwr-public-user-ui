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
import { when } from "jest-when";
import {
  testBrowserPageTitle,
  testPageHeading,
} from "../../../../../helpers/page-title-and-heading.js";
import { testRedirectsToSignInWhenLoggedOut } from "../../../../../helpers/sign-in-redirect.js";

jest.mock("../../../../../../app/session/index.js");

describe("pigs pcr result test", () => {
  const auth = { credentials: {}, strategy: "cookie" };
  const url = "/livestock/pigs-pcr-result";

  let server;

  beforeAll(async () => {
    setSessionData.mockImplementation(() => {});
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
      .mockReturnValue({ typeOfLivestock: "pigs", reference: "TEMP-6GSE-PIR8" });

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

    server = await createServer();
    await server.initialize();
  });

  afterAll(async () => {
    await server.stop();
    jest.resetAllMocks();
  });

  describe(`GET ${url} route`, () => {
    const getResponse = () => server.inject({ method: "GET", url, auth });

    testBrowserPageTitle({ title: "Pig livestock PCR test-result", getResponse });
    testPageHeading({ heading: "What was the result of the PCR test?", getResponse });

    test("returns 200", async () => {
      const res = await getResponse();

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      expectPhaseBanner.ok($);
    });

    testRedirectsToSignInWhenLoggedOut({
      getResponse: () => server.inject({ method: "GET", url }),
    });
  });

  describe(`POST ${url} route`, () => {
    let crumb;

    beforeEach(async () => {
      jest.resetAllMocks();
      crumb = await getCrumbs(server);
    });

    testRedirectsToSignInWhenLoggedOut({
      getResponse: () =>
        server.inject({
          method: "POST",
          url,
          payload: { crumb, pcrResult: "positive" },
          headers: { cookie: `crumb=${crumb}` },
        }),
    });

    test("shows error when payload is invalid", async () => {
      const options = {
        method: "POST",
        url,
        auth,
        payload: { crumb, pcrResult: "" },
        headers: { cookie: `crumb=${crumb}` },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(400);
      const $ = cheerio.load(res.payload);
      expect($("h1").text()).toMatch("What was the result of the PCR test?");
      expect($("#pcrResult-error").text()).toMatch("Select the result of the test");
    });

    test("redirects to pigs genetic sequencing page if positive result", async () => {
      const options = {
        method: "POST",
        url,
        auth,
        payload: { crumb, pcrResult: "positive" },
        headers: { cookie: `crumb=${crumb}` },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location.toString()).toEqual("/livestock/pigs-genetic-sequencing");
      expect(setSessionData).toHaveBeenCalledTimes(1);
    });

    test("redirects to pigs biosecurity page if negative result", async () => {
      const options = {
        method: "POST",
        url,
        auth,
        payload: { crumb, pcrResult: "negative" },
        headers: { cookie: `crumb=${crumb}` },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location.toString()).toEqual("/livestock/biosecurity-assessment");
      expect(setSessionData).toHaveBeenCalledTimes(2);
    });
  });
});

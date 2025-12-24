import * as cheerio from "cheerio";
import { createServer } from "../../../../../app/server.js";
import { getSessionData, setSessionData } from "../../../../../app/session/index.js";
import expectPhaseBanner from "assert";
import { getCrumbs } from "../../../../utils/get-crumbs.js";
import { sendInvalidDataEvent } from "../../../../../app/messaging/ineligibility-event-emission.js";

jest.mock("../../../../../app/messaging/ineligibility-event-emission.js");
jest.mock("../../../../../app/session/index.js");

describe("Number of fluid oral samples test", () => {
  const auth = { credentials: {}, strategy: "cookie" };
  const url = "/number-of-fluid-oral-samples";

  let server;

  beforeAll(async () => {
    setSessionData.mockImplementation(() => {});
    getSessionData.mockImplementation(() => {
      return { typeOfLivestock: "pigs", reference: "TEMP-6GSE-PIR8" };
    });

    server = await createServer();
    await server.initialize();
  });

  afterAll(async () => {
    await server.stop();
    jest.resetAllMocks();
  });

  describe(`GET ${url} route`, () => {
    test("returns 200", async () => {
      const options = {
        method: "GET",
        url,
        auth,
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      expect($("h1").text()).toMatch("How many oral fluid samples were tested?");
      expect($("title").text()).toContain(
        "How many oral fluid samples were tested? - Get funding to improve animal health and welfare",
      );
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
        payload: { crumb, numberOfOralFluidSamples: "123" },
        headers: { cookie: `crumb=${crumb}` },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location.toString()).toEqual(`/sign-in`);
    });

    test("shows error when payload is invalid", async () => {
      const options = {
        method: "POST",
        url,
        auth,
        payload: { crumb, numberOfOralFluidSamples: "" },
        headers: { cookie: `crumb=${crumb}` },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(400);
      const $ = cheerio.load(res.payload);
      expect($("h1").text()).toMatch("How many oral fluid samples were tested?");
      expect($("#main-content > div > div > div > div > div > ul > li > a").text()).toMatch(
        "Enter the number of oral fluid samples",
      );
      expect($("#numberOfOralFluidSamples-error").text()).toMatch(
        "Enter the number of oral fluid samples",
      );
    });

    test("shows error page when number of tests is < 5", async () => {
      const options = {
        method: "POST",
        url,
        auth,
        payload: { crumb, numberOfOralFluidSamples: "1" },
        headers: { cookie: `crumb=${crumb}` },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(400);
      const $ = cheerio.load(res.payload);
      expect($("h1").text()).toMatch("You cannot continue with your claim");
      expect(sendInvalidDataEvent).toHaveBeenCalled();
    });

    test("redirects to next page when number of tests is >= 5", async () => {
      const options = {
        method: "POST",
        url,
        auth,
        payload: { crumb, numberOfOralFluidSamples: "5" },
        headers: { cookie: `crumb=${crumb}` },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location.toString()).toEqual("/test-results");
      expect(setSessionData).toHaveBeenCalled();
    });
  });
});

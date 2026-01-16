import * as cheerio from "cheerio";
import { createServer } from "../../../../../app/server.js";
import { sendInvalidDataEvent } from "../../../../../app/messaging/ineligibility-event-emission.js";
import { getSessionData, setSessionData } from "../../../../../app/session/index.js";
import expectPhaseBanner from "assert";
import { getCrumbs } from "../../../../utils/get-crumbs.js";

jest.mock("../../../../../app/messaging/ineligibility-event-emission.js");
jest.mock("../../../../../app/session/index.js");

describe("Type of samples taken test", () => {
  const auth = { credentials: {}, strategy: "cookie" };
  const url = "/type-of-samples-taken";

  let server;

  beforeAll(async () => {
    sendInvalidDataEvent.mockImplementation(() => {});
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
      expect($("h1").text()).toMatch("What type of samples were taken?");
      expect($("title").text()).toContain(
        "What type of samples were taken? - Get funding to improve animal health and welfare",
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
      expect(res.headers.location.toString()).toEqual("/sign-in");
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
        payload: { crumb, typeOfSamplesTaken: "blood" },
        headers: { cookie: `crumb=${crumb}` },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location.toString()).toEqual("/sign-in");
    });

    test("shows error when payload is invalid", async () => {
      const options = {
        method: "POST",
        url,
        auth,
        payload: { crumb },
        headers: { cookie: `crumb=${crumb}` },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(400);
      const $ = cheerio.load(res.payload);
      expect($("h1").text()).toMatch("What type of samples were taken?");
      expect($("#main-content > div > div > div > div > div > ul > li > a").text()).toMatch(
        "Select what type of samples where taken",
      );
      expect($("#typeOfSamplesTaken-error").text()).toMatch(
        "Select what type of samples where taken",
      );
    });

    test("redirects to endemicsNumberOfBloodSamples page when typeOfSamplesTaken is blood", async () => {
      const options = {
        method: "POST",
        url,
        auth,
        payload: { crumb, typeOfSamplesTaken: "blood" },
        headers: { cookie: `crumb=${crumb}` },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location.toString()).toEqual("/number-of-blood-samples");
      expect(setSessionData).toHaveBeenCalled();
    });

    test("redirects to endemicsNumberOfOralFluidSamples page when typeOfSamplesTaken is oral-fluid", async () => {
      const options = {
        method: "POST",
        url,
        auth,
        payload: { crumb, typeOfSamplesTaken: "oral-fluid" },
        headers: { cookie: `crumb=${crumb}` },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location.toString()).toEqual("/number-of-fluid-oral-samples");
      expect(setSessionData).toHaveBeenCalled();
    });
  });
});

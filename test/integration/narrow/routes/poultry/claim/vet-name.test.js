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
import { axe } from "../../../../../helpers/axe-helper.js";
import { config } from "../../../../../../app/config/index.js";

const errorMessages = {
  enterName: "Enter the vet's name",
  nameLength: "Vet's name must be 50 characters or fewer",
  namePattern:
    "Vet's name must only include letters a to z, numbers and special characters such as hyphens, spaces, apostrophes, ampersands, commas, brackets or a forward slash",
};

jest.mock("../../../../../../app/session/index.js");

describe("Vet name test", () => {
  const auth = { credentials: {}, strategy: "cookie" };
  const url = "/poultry/vet-name";
  let server;

  beforeAll(async () => {
    config.poultry.enabled = true;

    server = await createServer();
    await server.initialize();
  });

  afterAll(async () => {
    await server.stop();
  });

  beforeEach(() => {
    jest.clearAllMocks();

    setSessionData.mockImplementation(() => {});
    when(getSessionData)
      .calledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.latestPoultryApplication,
      )
      .mockReturnValue({ status: "AGREED" });

    when(getSessionData)
      .calledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.vetsName,
      )
      .mockReturnValue("");

    when(getSessionData)
      .calledWith(
        expect.anything(),
        sessionEntryKeys.confirmedDetails,
        sessionKeys.confirmedDetails,
      )
      .mockReturnValue(true);
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
      expect(await axe(res.payload)).toHaveNoViolations();
      expect($("h1").text()).toMatch("What is the vet's name?");
      expect($("title").text().trim()).toContain(
        "What is the vet's name? - Get funding to improve animal health and welfare",
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
        payload: { crumb, numberAnimalsTested: "123" },
        headers: { cookie: `crumb=${crumb}` },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location.toString()).toEqual(`/sign-in`);
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
        expect(res.headers.location).toEqual("/poultry/vet-rcvs");
        expect(setSessionData).toHaveBeenCalledTimes(1);
        expect(setSessionData).toHaveBeenCalledWith(
          res.request,
          "poultryClaim",
          "vetsName",
          vetsName,
        );
      },
    );
  });
});

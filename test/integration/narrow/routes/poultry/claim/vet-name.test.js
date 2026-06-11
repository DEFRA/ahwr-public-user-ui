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

const errorMessages = {
  enterName: "Enter the vet's name",
  nameLength: "The vet's name must be 50 characters or less",
  namePattern:
    "The vet's name must only include letters a to z, numbers and special characters such as hyphens, spaces, apostrophes, ampersands, commas, parentheses or a forward slash",
};

jest.mock("../../../../../../app/session/index.js");

describe("/poultry/vet-name", () => {
  const auth = { credentials: {}, strategy: "cookie" };
  const url = "/poultry/vet-name";
  let server;

  beforeAll(async () => {
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

    when(getSessionData)
      .calledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.reference,
      )
      .mockReturnValue("POUL-1LZ5-ELVQ");
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

    test("pre-populates input with previously entered vet name", async () => {
      when(getSessionData)
        .calledWith(
          expect.anything(),
          sessionEntryKeys.poultryClaim,
          sessionKeys.poultryClaim.vetsName,
        )
        .mockReturnValue("John Smith");

      const options = {
        method: "GET",
        url,
        auth,
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      expect($("#vetsName").val()).toBe("John Smith");
      expect(await axe(res.payload)).toHaveNoViolations();
    });

    test("back link points to /poultry/minimum-number-of-birds", async () => {
      const options = {
        method: "GET",
        url,
        auth,
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      expect($(".govuk-back-link").attr("href")).toBe("/poultry/minimum-number-of-birds");
      expect(await axe(res.payload)).toHaveNoViolations();
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

    test("redirects to apply journey when poultry agreement is not AGREED", async () => {
      when(getSessionData)
        .calledWith(
          expect.anything(),
          sessionEntryKeys.poultryClaim,
          sessionKeys.poultryClaim.latestPoultryApplication,
        )
        .mockReturnValue({ status: "REJECTED" });

      const options = {
        method: "GET",
        url,
        auth,
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe("/poultry/you-can-claim-multiple");
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
        payload: { crumb, vetsName: "Test Vet" },
        headers: { cookie: `crumb=${crumb}` },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location.toString()).toEqual(`/sign-in`);
    });

    test.each([
      { vetsName: "", error: errorMessages.enterName, description: "empty name" },
      {
        vetsName: "dfdddfdf6697979779779dfdddfdf669797977977955444556655",
        error: errorMessages.nameLength,
        description: "name too long",
      },
      {
        vetsName: "****",
        error: errorMessages.namePattern,
        description: "invalid characters",
      },
    ])("returns 400 when vet name is invalid - $description", async ({ vetsName, error }) => {
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
      expect($("title").text().trim()).toContain("Error: What is the vet's name?");
      expect($(".govuk-error-summary__title").text().trim()).toBe("There is a problem");
      expect($("#main-content > div > div > div > div > div > ul > li > a").text()).toMatch(error);
      expect($('a[href="#vetsName"]').text().trim()).toBe(error);
      expect($("#vetsName-error").text()).toMatch(error);
      expect($("#vetsName").val()).toBe(vetsName);
      expect(await axe(res.payload)).toHaveNoViolations();
    });
    test.each([{ vetsName: "Adam" }, { vetsName: "(Sarah)" }, { vetsName: "Kevin&&" }])(
      "returns 302 and redirects to /poultry/vet-rcvs when vet name is valid - $vetsName",
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

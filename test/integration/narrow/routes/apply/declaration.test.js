import * as cheerio from "cheerio";
import { ok } from "../../../../utils/phase-banner-expect";
import { getCrumbs } from "../../../../utils/get-crumbs";
import { userType } from "../../../../../app/constants/constants";
import {
  clearApplyRedirect,
  getSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../../../../app/session/index.js";
import { createServer } from "../../../../../app/server";
import { StatusCodes } from "http-status-codes";
import {
  createApplication,
  getApplicationsBySbi,
} from "../../../../../app/api-requests/application-api";
import { when } from "jest-when";

jest.mock("../../../../../app/session/index");
jest.mock("../../../../../app/api-requests/application-api");

describe("Declaration test", () => {
  const organisation = {
    id: "organisation",
    name: "org-name",
    address: "1 fake street, fakerton, FA1 2DA",
    sbi: "0123456789",
    userType: userType.NEW_USER,
  };
  const auth = {
    credentials: { reference: "1111", sbi: "111111111" },
    strategy: "cookie",
  };

  let server;

  beforeAll(async () => {
    server = await createServer();
    await server.initialize();
  });

  afterAll(async () => {
    await server.stop();
  });

  when(getSessionData)
    .calledWith(
      expect.anything(),
      sessionEntryKeys.farmerApplyData,
      sessionKeys.farmerApplyData.organisation,
    )
    .mockReturnValue(organisation);

  when(getSessionData)
    .calledWith(expect.anything(), sessionEntryKeys.farmerApplyData)
    .mockReturnValue({ organisation, reference: "TEMP-PJ7E-WSI8" });

  when(getSessionData)
    .calledWith(expect.anything(), sessionEntryKeys.application)
    .mockReturnValue({ reference: "IAHW-1234-ABCD" });

  createApplication.mockResolvedValue({ applicationReference: "IAHW-PJ7E-WSI8" });

  describe("GET /declaration route", () => {
    test("when not logged in redirects to dashboard /sign-in", async () => {
      const options = {
        method: "GET",
        url: "/declaration",
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY);
      expect(res.headers.location.toString()).toEqual("/sign-in");
    });

    test("returns 200 when organisation found in session", async () => {
      const options = {
        method: "GET",
        url: "/declaration",
        auth,
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(StatusCodes.OK);
      const $ = cheerio.load(res.payload);
      expect($("h1").text()).toMatch("Review your agreement offer");
      expect($("title").text()).toMatch(
        "Review your agreement offer - Get funding to improve animal health and welfare",
      );
      ok($);
      const expectedHerdsText = `If the RPA requests evidence that your reviews or follow-ups took place, or details of the herd or flocks you have, you must provide it. This will be on your vet summary.`;
      const herdsText = $("p")
        .filter((i, el) => {
          return $(el).text().trim().startsWith("If the RPA requests evidence");
        })
        .first();
      expect(herdsText.length).toBe(1);
      expect(herdsText.text().trim()).toBe(expectedHerdsText);
    });
  });

  describe("POST /declaration route", () => {
    test("returns 200, caches data and sends message for valid request", async () => {
      const applications = [{ organisation, reference: "TEMP-PJ7E-WSI8" }];
      getApplicationsBySbi.mockReturnValue(applications);
      const crumb = await getCrumbs(server);
      const options = {
        method: "POST",
        url: "/declaration",
        payload: { crumb, terms: "agree", offerStatus: "accepted" },
        auth,
        headers: { cookie: `crumb=${crumb}` },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(StatusCodes.OK);
      const $ = cheerio.load(res.payload);
      expect($("h1").text()).toMatch("Application complete");
      expect($("title").text()).toMatch(
        "Application complete - Get funding to improve animal health and welfare",
      );
      ok($);
      expect(clearApplyRedirect).toHaveBeenCalled();
    });

    test("returns 200, shows offer rejection content on rejection", async () => {
      const crumb = await getCrumbs(server);
      const options = {
        method: "POST",
        url: "/declaration",
        payload: { crumb, terms: "agree", offerStatus: "rejected" },
        auth,
        headers: { cookie: `crumb=${crumb}` },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(StatusCodes.OK);
      const $ = cheerio.load(res.payload);
      expect($("title").text()).toMatch(
        "Agreement offer rejected - Get funding to improve animal health and welfare",
      );
      ok($);
    });

    test("returns 400 when request is not valid", async () => {
      when(getSessionData)
        .calledWith(
          expect.anything(),
          sessionEntryKeys.farmerApplyData,
          sessionKeys.farmerApplyData.organisation,
        )
        .mockReturnValue({ organisation });
      const crumb = await getCrumbs(server);
      const options = {
        method: "POST",
        url: "/declaration",
        payload: { crumb, offerStatus: "accepted" },
        auth,
        headers: { cookie: `crumb=${crumb}` },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(StatusCodes.BAD_REQUEST);
      const $ = cheerio.load(res.payload);
      expect($("h1.govuk-heading-l").text()).toEqual("Review your agreement offer");
      expect($("title").text()).toMatch(
        "Review your agreement offer - Get funding to improve animal health and welfare",
      );
      expect($("#organisation-name").text()).toEqual(organisation.name);
      expect($("#organisation-address").text()).toContain("1 fake street");
      expect($("#organisation-sbi").text()).toEqual(organisation.sbi);
      expect($("#terms-error").text()).toMatch(
        "Select yes if you have read and agree to the terms and conditions",
      );
    });

    test("when not logged in redirects to dashboard /sign-in", async () => {
      const crumb = await getCrumbs(server);
      const options = {
        method: "POST",
        url: "/declaration",
        payload: { crumb },
        headers: { cookie: `crumb=${crumb}` },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY);
      expect(res.headers.location.toString()).toEqual("/sign-in");
    });

    test("returns 500 when application reference is null", async () => {
      createApplication.mockResolvedValue(null);
      const crumb = await getCrumbs(server);
      const options = {
        method: "POST",
        url: "/declaration",
        payload: { crumb, terms: "agree", offerStatus: "accepted" },
        auth,
        headers: { cookie: `crumb=${crumb}` },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
      const $ = cheerio.load(res.payload);
      expect($("h1").text()).toEqual("Sorry, there is a problem with the service");
    });
  });
});

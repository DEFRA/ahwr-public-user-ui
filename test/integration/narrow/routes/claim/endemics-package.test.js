import * as cheerio from "cheerio";
import { createServer } from "../../../../../app/server.js";
import { getSessionData } from "../../../../../app/session/index.js";
import expectPhaseBanner from "assert";
import { getCrumbs } from "../../../../utils/get-crumbs.js";

jest.mock("../../../../../app/session/index.js");

describe("Endemics package test", () => {
  const auth = { credentials: {}, strategy: "cookie" };
  const url = "/sheep-endemics-package";

  let server;

  beforeAll(async () => {
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
    test("Returns 200", async () => {
      const options = {
        method: "GET",
        url,
        auth,
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      expect($("h1").text().trim()).toMatch("Which sheep health package did you choose?");
      expect($("title").text()).toContain(
        "Which sheep health package did you choose? - Get funding to improve animal health and welfare",
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

    test("backlink", async () => {
      const options = {
        method: "GET",
        url,
        auth,
      };

      const res = await server.inject(options);
      const $ = cheerio.load(res.payload);
      expect($(".govuk-back-link").attr("href")).toContain("/vet-rcvs");
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
        payload: { crumb, herdVaccinationStatus: "vaccinated" },
        headers: { cookie: `crumb=${crumb}` },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location.toString()).toEqual(`/sign-in`);
    });

    test.each([
      { sheepEndemicsPackage: undefined, errorMessage: "Select a sheep health package" },
      { sheepEndemicsPackage: null, errorMessage: "Select a sheep health package" },
      { sheepEndemicsPackage: "impossible", errorMessage: "Select a sheep health package" },
    ])(
      "returns 400 when payload is invalid - %p",
      async ({ sheepEndemicsPackage, errorMessage }) => {
        const options = {
          method: "POST",
          url,
          auth,
          payload: { crumb, sheepEndemicsPackage },
          headers: { cookie: `crumb=${crumb}` },
        };

        const res = await server.inject(options);

        expect(res.statusCode).toBe(400);
        const $ = cheerio.load(res.payload);
        expect($("h1").text().trim()).toMatch("Which sheep health package did you choose?");
        expect($("#main-content > div > div > div > div > div > ul > li > a").text()).toMatch(
          errorMessage,
        );
        expect($("#sheepEndemicsPackage-error").text()).toMatch(errorMessage);
      },
    );

    test.each([
      { sheepEndemicsPackage: "improvedEwePerformance" },
      { sheepEndemicsPackage: "improvedReproductivePerformance" },
      { sheepEndemicsPackage: "improvedLambPerformance" },
      { sheepEndemicsPackage: "improvedNeonatalLambSurvival" },
      { sheepEndemicsPackage: "reducedExternalParasites" },
      { sheepEndemicsPackage: "reducedLameness" },
    ])(
      "returns 200 when payload is valid and stores in session (sheepEndemicsPackage= $sheepEndemicsPackage)",
      async ({ sheepEndemicsPackage }) => {
        const options = {
          method: "POST",
          url,
          auth,
          payload: { crumb, sheepEndemicsPackage },
          headers: { cookie: `crumb=${crumb}` },
        };

        const res = await server.inject(options);

        expect(res.statusCode).toBe(302);
        expect(res.headers.location).toEqual("/sheep-tests");
      },
    );
  });
});

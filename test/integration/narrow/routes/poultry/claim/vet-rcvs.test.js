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
import { config } from "../../../../../../app/config/index.js";

jest.mock("../../../../../../app/session/index.js");
jest.mock("../../../../../../app/lib/context-helper.js");

const errorMessages = {
  enterRCVS: "Enter an RCVS number",
  validRCVS: "An RCVS number is a 7 digit number or a 6 digit number ending in a letter.",
};

describe("/poultry/vet-rcvs", () => {
  const auth = { credentials: {}, strategy: "cookie" };
  const url = "/poultry/vet-rcvs";
  let server;

  beforeAll(async () => {
    config.poultry.enabled = true;
    setSessionData.mockImplementation(() => {});
    server = await createServer();
    await server.initialize();
  });

  beforeEach(() => {
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
        sessionEntryKeys.confirmedDetails,
        sessionKeys.confirmedDetails,
      )
      .mockReturnValue(true);
  });

  afterAll(async () => {
    jest.resetAllMocks();
    await server.stop();
  });

  describe(`GET /poultry/vet-rcvs`, () => {
    test("returns 200 and displays page correctly when visting page first time", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({});

      const options = {
        method: "GET",
        url,
        auth,
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      expect($("h1 > label").text().trim()).toMatch(
        "What is the vet's Royal College of Veterinary Surgeons (RCVS) number?",
      );
      expect($("title").text().trim()).toContain(
        "What is the vet's Royal College of Veterinary Surgeons (RCVS) number? - Get funding to improve animal health and welfare",
      );
      expectPhaseBanner.ok($);
    });

    test("returns 200 and displays page correctly with previously entered answer", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({ vetRCVSNumber: "1234567" });

      const options = {
        method: "GET",
        url,
        auth,
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      expect($("h1 > label").text().trim()).toMatch(
        "What is the vet's Royal College of Veterinary Surgeons (RCVS) number?",
      );
      expect($("title").text().trim()).toContain(
        "What is the vet's Royal College of Veterinary Surgeons (RCVS) number? - Get funding to improve animal health and welfare",
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

  describe(`POST /poultry/vet-rcvs`, () => {
    let crumb;

    beforeEach(async () => {
      crumb = await getCrumbs(server);
    });

    test("when not logged in redirects to /sign-in", async () => {
      const options = {
        method: "POST",
        url,
        payload: { crumb, vetRCVSNumber: "123" },
        headers: { cookie: `crumb=${crumb}` },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location.toString()).toEqual(`/sign-in`);
    });

    test.each([
      { vetRCVSNumber: undefined, errorMessage: errorMessages.enterRCVS, expectedVal: undefined },
      { vetRCVSNumber: null, errorMessage: errorMessages.enterRCVS, expectedVal: undefined },
      { vetRCVSNumber: "", errorMessage: errorMessages.enterRCVS, expectedVal: "" },
      {
        vetRCVSNumber: "not-valid-ref",
        errorMessage: errorMessages.validRCVS,
        expectedVal: "not-valid-ref",
      },
      { vetRCVSNumber: "123456A", errorMessage: errorMessages.validRCVS, expectedVal: "123456A" },
      { vetRCVSNumber: "12345678", errorMessage: errorMessages.validRCVS, expectedVal: "12345678" },
    ])(
      "returns 400 when payload is invalid - %p",
      async ({ vetRCVSNumber, errorMessage, expectedVal }) => {
        const options = {
          method: "POST",
          url,
          auth,
          payload: { crumb, vetRCVSNumber },
          headers: { cookie: `crumb=${crumb}` },
        };

        const res = await server.inject(options);

        expect(res.statusCode).toBe(400);
        const $ = cheerio.load(res.payload);
        expect($("h1 > label").text().trim()).toMatch(
          "What is the vet's Royal College of Veterinary Surgeons (RCVS) number?",
        );
        expect($("#main-content > div > div > div > div > div > ul > li > a").text()).toMatch(
          errorMessage,
        );
        expect($("#vetRCVSNumber").val()).toEqual(expectedVal);
      },
    );

    test("returns 200 when vetRCVSNumber is 7 digits", async () => {
      const options = {
        method: "POST",
        url,
        auth,
        payload: { crumb, vetRCVSNumber: "1234567" },
        headers: { cookie: `crumb=${crumb}` },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toEqual("/poultry/biosecurity");
      expect(setSessionData).toHaveBeenCalledWith(
        expect.any(Object),
        "poultryClaim",
        "vetRCVSNumber",
        "1234567",
      );
    });

    test("returns 200 when vetRCVSNumber is 6 digits and a character", async () => {
      const options = {
        method: "POST",
        url,
        auth,
        payload: { crumb, vetRCVSNumber: "123456X" },
        headers: { cookie: `crumb=${crumb}` },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toEqual("/poultry/biosecurity");
      expect(setSessionData).toHaveBeenCalledWith(
        expect.any(Object),
        "poultryClaim",
        "vetRCVSNumber",
        "123456X",
      );
    });
  });
});

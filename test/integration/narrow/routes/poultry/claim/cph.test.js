import * as cheerio from "cheerio";
import { createServer } from "../../../../../../app/server.js";
import {
  testBrowserPageTitle,
  testPageHeading,
} from "../../../../../helpers/page-title-and-heading.js";
import { getCrumbs } from "../../../../../utils/get-crumbs.js";
import expectPhaseBanner from "assert";
import {
  getSessionData,
  setSessionData,
  emitHerdEvent,
  sessionEntryKeys,
  sessionKeys,
} from "../../../../../../app/session/index.js";
import { when } from "jest-when";
import { axe } from "../../../../../helpers/axe-helper.js";
import { getClaimsCount } from "../../../../../../app/api-requests/claim-api.js";
import { POULTRY_SCHEME } from "ffc-ahwr-common-library";

jest.mock("../../../../../../app/session/index.js");
jest.mock("../../../../../../app/api-requests/claim-api.js");

describe("/cph tests", () => {
  const url = `/poultry/cph`;
  const auth = {
    credentials: { reference: "1111", sbi: "111111111" },
    strategy: "cookie",
  };
  let server;
  let crumb;

  beforeAll(async () => {
    setSessionData.mockImplementation(() => {});
    server = await createServer();
    await server.initialize();
  });

  afterAll(async () => {
    await server.stop();
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

    when(getSessionData)
      .calledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.reference,
      )
      .mockReturnValue("POUL-1LZ5-ELVQ");
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe("GET", () => {
    const getResponse = () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({ reference: "TEMP-6GSE-PIR8" });
      return server.inject({ method: "GET", url, auth });
    };
    testBrowserPageTitle({ title: "CPH number for this poultry site", getResponse });
    testPageHeading({
      heading: "Enter the county parish holding (CPH) number for this site",
      getResponse,
    });

    test("displays page correctly when entering cph for first time", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          reference: "TEMP-6GSE-PIR8",
        });

      const res = await server.inject({ method: "GET", url, auth });

      expect(await axe(res.payload)).toHaveNoViolations();
      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      expect($(".govuk-back-link").attr("href")).toContain("/site-name");
      expectPhaseBanner.ok($);
    });

    test("displays previously entered cph", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          reference: "TEMP-6GSE-PIR8",
          herdCph: "22/333/4444",
        });

      const res = await server.inject({ method: "GET", url, auth });

      expect(await axe(res.payload)).toHaveNoViolations();
      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      expect($(".govuk-back-link").attr("href")).toContain("/site-name");
      expect($("input#herdCph").val()).toBe("22/333/4444");
      expectPhaseBanner.ok($);
    });

    test("returns 200 with back link to select site when updating an existing site", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          reference: "TEMP-6GSE-PIR8",
          herdVersion: 2,
          herdCph: "22/333/4444",
        });

      const res = await server.inject({ method: "GET", url, auth });

      expect(await axe(res.payload)).toHaveNoViolations();
      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      expect($(".govuk-back-link").attr("href")).toContain("/select-site");
      expectPhaseBanner.ok($);
    });
  });

  describe("POST", () => {
    beforeEach(async () => {
      getClaimsCount.mockResolvedValue({ count: 0 });
    });

    beforeAll(async () => {
      crumb = await getCrumbs(server);
    });

    test("navigates to site others when no previous herds and payload is valid", async () => {
      getSessionData.mockReturnValue({
        reference: "TEMP-6GSE-PIR8",
      });

      const res = await server.inject({
        method: "POST",
        url,
        auth,
        payload: { crumb, herdCph: "22/333/4444" },
        headers: { cookie: `crumb=${crumb}` },
      });

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toEqual("/poultry/sbi-sites");
      expect(setSessionData).toHaveBeenCalled();
      expect(emitHerdEvent).toHaveBeenCalled();
    });

    describe("cph number validation", () => {
      describe("display errors when cph number is missing", () => {
        const getResponse = () => {
          getSessionData.mockReturnValue({
            reference: "TEMP-6GSE-PIR8",
          });

          return server.inject({
            method: "POST",
            url,
            auth,
            payload: { crumb },
            headers: { cookie: `crumb=${crumb}` },
          });
        };
        testBrowserPageTitle({ title: "Error: CPH number for this poultry site", getResponse });
        testPageHeading({
          heading: "Enter the county parish holding (CPH) number for this site",
          getResponse,
        });

        test("display errors when cph number is missing", async () => {
          const res = await getResponse();

          expect(await axe(res.payload)).toHaveNoViolations();
          const $ = cheerio.load(res.payload);
          expect(res.statusCode).toBe(400);
          expect($("h2.govuk-error-summary__title").text()).toContain("There is a problem");
          expect($('a[href="#herdCph"]').text()).toContain(
            "Enter the CPH for this site in the format 12/345/6789",
          );
          expect($('p[id="herdCph-error"]').text()).toContain(
            "Enter the CPH for this site in the format 12/345/6789",
          );
          expect(emitHerdEvent).not.toHaveBeenCalled();
        });
      });

      describe("display errors when cph number does not contain digits", () => {
        const getResponse = () => {
          getSessionData.mockReturnValue({
            reference: "TEMP-6GSE-PIR8",
          });

          return server.inject({
            method: "POST",
            url,
            auth,
            payload: { crumb, herdCph: "aa/222/3333" },
            headers: { cookie: `crumb=${crumb}` },
          });
        };

        testBrowserPageTitle({ title: "Error: CPH number for this poultry site", getResponse });
        testPageHeading({
          heading: "Enter the county parish holding (CPH) number for this site",
          getResponse,
        });

        test("display errors when cph number does not contain digits", async () => {
          const res = await getResponse();

          expect(await axe(res.payload)).toHaveNoViolations();
          const $ = cheerio.load(res.payload);
          expect(res.statusCode).toBe(400);
          expect($("h2.govuk-error-summary__title").text()).toContain("There is a problem");
          expect($('a[href="#herdCph"]').text()).toContain(
            "Enter the CPH for this site in the format 12/345/6789",
          );
          expect($('p[id="herdCph-error"]').text()).toContain(
            "Enter the CPH for this site in the format 12/345/6789",
          );
          expect(emitHerdEvent).not.toHaveBeenCalled();
        });
      });

      test("it normalizes the cph number before validation", async () => {
        getSessionData.mockReturnValue({
          reference: "TEMP-6GSE-PIR8",
          herds: [{ id: "herd one" }],
          isOnlyHerdOnSbi: "no",
        });

        const res = await server.inject({
          method: "POST",
          url,
          auth,
          payload: { crumb, herdCph: "22-3 3 3-4444 " },
          headers: { cookie: `crumb=${crumb}` },
        });

        expect(res.statusCode).toBe(302);
        expect(res.headers.location).toEqual("/poultry/sbi-sites");
        expect(setSessionData).toHaveBeenCalled();
        expect(emitHerdEvent).toHaveBeenCalled();
      });

      describe("displays error when cph has been used in other claims", () => {
        const getResponse = () => {
          getSessionData.mockReturnValue({
            reference: "TEMP-6GSE-PIR8",
            herdId: "e3d320b7-b2cf-469a-903f-ead7587d98e9",
          });
          getClaimsCount.mockResolvedValueOnce({ count: 2 });

          return server.inject({
            method: "POST",
            url,
            auth,
            payload: { crumb, herdCph: "22/333/4444" },
            headers: { cookie: `crumb=${crumb}` },
          });
        };
        testBrowserPageTitle({ title: "Error: CPH number for this poultry site", getResponse });
        testPageHeading({
          heading: "Enter the county parish holding (CPH) number for this site",
          getResponse,
        });

        test("displays error when cph has been used in other claims", async () => {
          const res = await getResponse();
          expect(await axe(res.payload)).toHaveNoViolations();
          const $ = cheerio.load(res.payload);
          expect(res.statusCode).toBe(400);
          expect($("h2.govuk-error-summary__title").text()).toContain("There is a problem");
          expect($('a[href="#herdCph"]').text()).toContain(
            "Enter a CPH that you have not used for a different site",
          );
          expect($('p[id="herdCph-error"]').text()).toContain(
            "Enter a CPH that you have not used for a different site",
          );

          expect(emitHerdEvent).not.toHaveBeenCalled();
          expect(getClaimsCount).toHaveBeenCalledWith(
            "22/333/4444",
            "e3d320b7-b2cf-469a-903f-ead7587d98e9",
            POULTRY_SCHEME,
            expect.any(Object),
          );
        });
      });
    });

    describe("display errors with back link to select site when payload invalid and updating an existing herd", () => {
      const getResponse = () => {
        getSessionData.mockReturnValue({
          reference: "TEMP-6GSE-PIR8",
          herdVersion: 2,
        });

        return server.inject({
          method: "POST",
          url,
          auth,
          payload: { crumb },
          headers: { cookie: `crumb=${crumb}` },
        });
      };

      testBrowserPageTitle({ title: "Error: CPH number for this poultry site", getResponse });
      testPageHeading({
        heading: "Enter the county parish holding (CPH) number for this site",
        getResponse,
      });

      test("display errors with back link to select site when payload invalid and updating an existing herd", async () => {
        const res = await getResponse();
        expect(await axe(res.payload)).toHaveNoViolations();
        const $ = cheerio.load(res.payload);
        expect(res.statusCode).toBe(400);
        expect($("h2.govuk-error-summary__title").text()).toContain("There is a problem");
        expect($('a[href="#herdCph"]').text()).toContain(
          "Enter the CPH for this site in the format 12/345/6789",
        );
        expect($('p[id="herdCph-error"]').text()).toContain(
          "Enter the CPH for this site in the format 12/345/6789",
        );

        expect($(".govuk-back-link").attr("href")).toContain("/select-site");
        expect(emitHerdEvent).not.toHaveBeenCalled();
      });
    });
  });
});

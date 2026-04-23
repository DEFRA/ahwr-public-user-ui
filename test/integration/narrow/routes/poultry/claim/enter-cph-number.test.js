import * as cheerio from "cheerio";
import { createServer } from "../../../../../../app/server.js";
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
import { config } from "../../../../../../app/config/index.js";
import { getClaimsCount } from "../../../../../../app/api-requests/claim-api.js";

jest.mock("../../../../../../app/session/index.js");
jest.mock("../../../../../../app/api-requests/claim-api.js");

describe("/enter-cph-number tests", () => {
  const url = `/poultry/enter-cph-number`;
  const auth = {
    credentials: { reference: "1111", sbi: "111111111" },
    strategy: "cookie",
  };
  let server;
  let crumb;

  beforeAll(async () => {
    setSessionData.mockImplementation(() => {});
    config.poultry.enabled = true;
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
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  const expectSiteText = ($) => {
    expect($("title").text().trim()).toContain(
      "Enter the CPH number for this site - Get funding to improve animal health and welfare - GOV.UKGOV.UK",
    );
    expect($(".govuk-label").text().trim()).toBe(
      "Enter the County Parish Holding (CPH) number for this site",
    );
  };

  describe("GET", () => {
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
      expect($(".govuk-back-link").attr("href")).toContain("/enter-site-name");
      expectSiteText($);
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
      expect($(".govuk-back-link").attr("href")).toContain("/enter-site-name");
      expect($("input#herdCph").val()).toBe("22/333/4444");
      expectSiteText($);
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
      expect($(".govuk-back-link").attr("href")).toContain("/select-the-site");
      expectSiteText($);
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
      expect(res.headers.location).toEqual("/poultry/site-others-on-sbi");
      expect(setSessionData).toHaveBeenCalled();
      expect(emitHerdEvent).toHaveBeenCalled();
    });

    test("navigates to check site details when there are previous herds and othersOnSbi is yes", async () => {
      getSessionData.mockReturnValue({
        reference: "TEMP-6GSE-PIR8",
        herds: [{ id: "herd one" }],
        isOnlyHerdOnSbi: "yes",
      });

      const res = await server.inject({
        method: "POST",
        url,
        auth,
        payload: { crumb, herdCph: "22/333/4444" },
        headers: { cookie: `crumb=${crumb}` },
      });

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toEqual("/poultry/check-site-details");
      expect(setSessionData).toHaveBeenCalled();
      expect(emitHerdEvent).toHaveBeenCalled();
    });

    test("navigates to enter site details when there are previous herds and othersOnSbi is no", async () => {
      getSessionData.mockReturnValue({
        reference: "TEMP-6GSE-PIR8",
        herds: [{ id: "herd one" }],
        isOnlyHerdOnSbi: "no",
      });

      const res = await server.inject({
        method: "POST",
        url,
        auth,
        payload: { crumb, herdCph: "22/333/4444" },
        headers: { cookie: `crumb=${crumb}` },
      });

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toEqual("/poultry/enter-site-details");
      expect(setSessionData).toHaveBeenCalled();
      expect(emitHerdEvent).toHaveBeenCalled();
    });

    describe("cph number validation", () => {
      test("display errors when cph number is missing", async () => {
        getSessionData.mockReturnValue({
          reference: "TEMP-6GSE-PIR8",
        });

        const res = await server.inject({
          method: "POST",
          url,
          auth,
          payload: { crumb },
          headers: { cookie: `crumb=${crumb}` },
        });

        expect(await axe(res.payload)).toHaveNoViolations();
        const $ = cheerio.load(res.payload);
        expect(res.statusCode).toBe(400);
        expect($("h2.govuk-error-summary__title").text()).toContain("There is a problem");
        expect($('a[href="#herdCph"]').text()).toContain(
          "Enter the CPH for this site, format should be nn/nnn/nnnn",
        );
        expect($('p[id="herdCph-error"]').text()).toContain(
          "Enter the CPH for this site, format should be nn/nnn/nnnn",
        );
        expectSiteText($);
        expect(emitHerdEvent).not.toHaveBeenCalled();
      });

      test("display errors when cph number does not contain digits", async () => {
        getSessionData.mockReturnValue({
          reference: "TEMP-6GSE-PIR8",
        });

        const res = await server.inject({
          method: "POST",
          url,
          auth,
          payload: { crumb, herdCph: "aa/222/3333" },
          headers: { cookie: `crumb=${crumb}` },
        });

        expect(await axe(res.payload)).toHaveNoViolations();
        const $ = cheerio.load(res.payload);
        expect(res.statusCode).toBe(400);
        expect($("h2.govuk-error-summary__title").text()).toContain("There is a problem");
        expect($('a[href="#herdCph"]').text()).toContain(
          "Enter the CPH for this site, format should be nn/nnn/nnnn",
        );
        expect($('p[id="herdCph-error"]').text()).toContain(
          "Enter the CPH for this site, format should be nn/nnn/nnnn",
        );
        expectSiteText($);
        expect(emitHerdEvent).not.toHaveBeenCalled();
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
        expect(res.headers.location).toEqual("/poultry/enter-site-details");
        expect(setSessionData).toHaveBeenCalled();
        expect(emitHerdEvent).toHaveBeenCalled();
      });

      test("displays error when cph has been used in other claims", async () => {
        getSessionData.mockReturnValue({
          reference: "TEMP-6GSE-PIR8",
          herdId: "e3d320b7-b2cf-469a-903f-ead7587d98e9",
        });
        getClaimsCount.mockResolvedValueOnce({ count: 2 });

        const res = await server.inject({
          method: "POST",
          url,
          auth,
          payload: { crumb, herdCph: "22/333/4444" },
          headers: { cookie: `crumb=${crumb}` },
        });

        expect(await axe(res.payload)).toHaveNoViolations();
        const $ = cheerio.load(res.payload);
        expect(res.statusCode).toBe(400);
        expect($("h2.govuk-error-summary__title").text()).toContain("There is a problem");
        expect($('a[href="#herdCph"]').text()).toContain(
          "You have already used this CPH, the CPH must be unique",
        );
        expect($('p[id="herdCph-error"]').text()).toContain(
          "You have already used this CPH, the CPH must be unique",
        );
        expectSiteText($);
        expect(emitHerdEvent).not.toHaveBeenCalled();
        expect(getClaimsCount).toHaveBeenCalledWith(
          "22/333/4444",
          "e3d320b7-b2cf-469a-903f-ead7587d98e9",
          expect.any(Object),
        );
      });
    });

    test("display errors with back link to select site when payload invalid and updating an existing herd", async () => {
      getSessionData.mockReturnValue({
        reference: "TEMP-6GSE-PIR8",
        herdVersion: 2,
      });

      const res = await server.inject({
        method: "POST",
        url,
        auth,
        payload: { crumb },
        headers: { cookie: `crumb=${crumb}` },
      });

      expect(await axe(res.payload)).toHaveNoViolations();
      const $ = cheerio.load(res.payload);
      expect(res.statusCode).toBe(400);
      expect($("h2.govuk-error-summary__title").text()).toContain("There is a problem");
      expect($('a[href="#herdCph"]').text()).toContain(
        "Enter the CPH for this site, format should be nn/nnn/nnnn",
      );
      expect($('p[id="herdCph-error"]').text()).toContain(
        "Enter the CPH for this site, format should be nn/nnn/nnnn",
      );
      expectSiteText($);
      expect($(".govuk-back-link").attr("href")).toContain("/select-the-site");
      expect(emitHerdEvent).not.toHaveBeenCalled();
    });
  });
});

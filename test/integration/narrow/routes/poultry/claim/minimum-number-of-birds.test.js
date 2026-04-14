import * as cheerio from "cheerio";
import { createServer } from "../../../../../../app/server.js";
import { getCrumbs } from "../../../../../utils/get-crumbs.js";
import expectPhaseBanner from "assert";
import {
  getSessionData,
  sessionEntryKeys,
  sessionKeys,
  setSessionData,
} from "../../../../../../app/session/index.js";
import { when } from "jest-when";
import { axe } from "../../../../../helpers/axe-helper.js";
import { config } from "../../../../../../app/config/index.js";

jest.mock("../../../../../../app/session/index.js");

describe("/poultry/minimum-number-of-birds tests", () => {
  const url = `/poultry/minimum-number-of-birds`;
  const auth = {
    credentials: { reference: "1111", sbi: "111111111" },
    strategy: "cookie",
  };
  let server;
  let crumb;

  beforeAll(async () => {
    config.poultry.enabled = true;
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
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe("GET", () => {
    test("returns 200 and displays page correctly", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          reference: "TEMP-6GSE-PIR8",
        });

      const res = await server.inject({ method: "GET", url, auth });

      expect(await axe(res.payload)).toHaveNoViolations();
      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      expect($("title").text().trim()).toContain(
        "Minimum number of birds - Get funding to improve animal health and welfare - GOV.UK",
      );
      expect($("#back").attr("href")).toContain("/select-poultry-type");
      const legend = $(".govuk-fieldset__legend--l");
      expect(legend.text().trim()).toBe(
        "Has your vet confirmed that this site can hold the minimum number of birds?",
      );
      expectPhaseBanner.ok($);
    });

    test("returns 200 when user has previously selected no", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          reference: "TEMP-6GSE-PIR8",
          minimumNumberOfBirds: "no",
        });

      const res = await server.inject({ method: "GET", url, auth });

      expect(await axe(res.payload)).toHaveNoViolations();
      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      expect($('.govuk-radios__input[value="no"]').is(":checked")).toBeTruthy();
      expectPhaseBanner.ok($);
    });

    test("returns 200 when user has previously selected yes", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          reference: "TEMP-6GSE-PIR8",
          minimumNumberOfBirds: "yes",
        });

      const res = await server.inject({ method: "GET", url, auth });

      expect(await axe(res.payload)).toHaveNoViolations();
      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      expect($('.govuk-radios__input[value="yes"]').is(":checked")).toBeTruthy();
      expectPhaseBanner.ok($);
    });
  });

  describe("POST", () => {
    beforeAll(async () => {
      crumb = await getCrumbs(server);
    });

    test("saves answer in session and navigates to vet name when yes selected", async () => {
      getSessionData.mockReturnValue({
        reference: "TEMP-6GSE-PIR8",
      });

      const res = await server.inject({
        method: "POST",
        url,
        auth,
        payload: { crumb, minimumNumberOfBirds: "yes" },
        headers: { cookie: `crumb=${crumb}` },
      });

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toEqual("/poultry/vet-name");
      expect(setSessionData).toHaveBeenCalledTimes(1);
      expect(setSessionData).toHaveBeenCalledWith(
        expect.any(Object),
        "poultryClaim",
        "minimumNumberOfBirds",
        "yes",
        { shouldEmitEvent: false },
      );
    });

    test("saves answer in session and shows exception page when no selected", async () => {
      getSessionData.mockReturnValue({
        reference: "TEMP-6GSE-PIR8",
      });

      const res = await server.inject({
        method: "POST",
        url,
        auth,
        payload: { crumb, minimumNumberOfBirds: "no" },
        headers: { cookie: `crumb=${crumb}` },
      });

      expect(res.statusCode).toBe(200);
      expect(setSessionData).toHaveBeenCalledTimes(1);
      expect(setSessionData).toHaveBeenCalledWith(
        expect.any(Object),
        "poultryClaim",
        "minimumNumberOfBirds",
        "no",
        { shouldEmitEvent: false },
      );
    });

    test("displays errors when no answer selected", async () => {
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
      expect($('a[href="#minimumNumberOfBirds"]').text()).toContain("Select one option");
      expect($("title").text().trim()).toContain(
        "Error: Minimum number of birds - Get funding to improve animal health and welfare - GOV.UK",
      );
    });
  });
});

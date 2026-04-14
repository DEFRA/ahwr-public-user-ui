import * as cheerio from "cheerio";
import { createServer } from "../../../../../../app/server.js";
import { getCrumbs } from "../../../../../utils/get-crumbs.js";
import expectPhaseBanner from "assert";
import {
  emitHerdEvent,
  getSessionData,
  sessionEntryKeys,
  sessionKeys,
  setSessionData,
} from "../../../../../../app/session/index.js";
import { when } from "jest-when";
import { axe } from "../../../../../helpers/axe-helper.js";
import { config } from "../../../../../../app/config/index.js";

jest.mock("../../../../../../app/session/index.js");

describe("/site-others-on-sbi tests", () => {
  const url = `/poultry/site-others-on-sbi`;
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
        "Is this the only site associated with this Single Business Identifier (SBI)? - Get funding to improve animal health and welfare - GOV.UKGOV.UK",
      );
      expect($(".govuk-back-link").attr("href")).toContain("/enter-cph-number");
      expect($(".govuk-hint").text()).toContain("Tell us about this site");
      const legend = $(".govuk-fieldset__legend--l");
      expect(legend.text().trim()).toBe(
        "Is this the only site associated with this Single Business Identifier (SBI)?",
      );
      expectPhaseBanner.ok($);
    });

    test("returns 200 when user has previously selected no", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          reference: "TEMP-6GSE-PIR8",
          isOnlyHerdOnSbi: "no",
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
          isOnlyHerdOnSbi: "yes",
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

    test("navigates to enter site details when no existing herd and they select yes", async () => {
      getSessionData.mockReturnValue({
        reference: "TEMP-6GSE-PIR8",
      });

      const res = await server.inject({
        method: "POST",
        url,
        auth,
        payload: { crumb, isOnlyHerdOnSbi: "yes" },
        headers: { cookie: `crumb=${crumb}` },
      });

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toEqual("/poultry/check-site-details");
      expect(setSessionData).toHaveBeenCalledTimes(2);
      expect(setSessionData).toHaveBeenCalledWith(
        expect.any(Object),
        "poultryClaim",
        "isOnlyHerdOnSbi",
        "yes",
        { shouldEmitEvent: false },
      );
      expect(setSessionData).toHaveBeenCalledWith(
        expect.any(Object),
        "poultryClaim",
        "herdReasons",
        ["onlyHerd"],
        { shouldEmitEvent: false },
      );
      expect(emitHerdEvent).toHaveBeenCalled();
    });

    test("navigates to check site details when no existing herd and they select no", async () => {
      getSessionData.mockReturnValue({
        reference: "TEMP-6GSE-PIR8",
      });

      const res = await server.inject({
        method: "POST",
        url,
        auth,
        payload: { crumb, isOnlyHerdOnSbi: "no" },
        headers: { cookie: `crumb=${crumb}` },
      });

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toEqual("/poultry/enter-site-details");
      expect(setSessionData).toHaveBeenCalledTimes(1);
      expect(setSessionData).toHaveBeenCalledWith(
        expect.any(Object),
        "poultryClaim",
        "isOnlyHerdOnSbi",
        "no",
        { shouldEmitEvent: false },
      );
      expect(emitHerdEvent).not.toHaveBeenCalled();
    });

    test("display errors with site labels when no answer selected and typeOfLivestock is not sheep", async () => {
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
      expect($('a[href="#isOnlyHerdOnSbi"]').text()).toContain(
        "Select yes if this is the only site associated with this SBI",
      );
      expect($("title").text().trim()).toContain(
        "Is this the only site associated with this Single Business Identifier (SBI)? - Get funding to improve animal health and welfare - GOV.UKGOV.UK",
      );
      expect($(".govuk-hint").text()).toContain("Tell us about this site");
      expect(emitHerdEvent).not.toHaveBeenCalled();
    });
  });
});

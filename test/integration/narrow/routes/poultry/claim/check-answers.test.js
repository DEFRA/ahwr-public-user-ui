import * as cheerio from "cheerio";
import Wreck from "@hapi/wreck";
import { createServer } from "../../../../../../app/server.js";
import expectPhaseBanner from "assert";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../../../../../app/session/index.js";
import { when } from "jest-when";
import { axe } from "../../../../../helpers/axe-helper.js";
import { config } from "../../../../../../app/config/index.js";
import { getCrumbs } from "../../../../../utils/get-crumbs.js";

jest.mock("../../../../../../app/session/index.js");

describe("Poultry check answers test", () => {
  const auth = { credentials: {}, strategy: "cookie" };
  const url = "/poultry/check-answers";
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
    jest.restoreAllMocks();

    when(getSessionData)
      .calledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.latestPoultryApplication,
      )
      .mockReturnValue({ status: "AGREED" });

    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
      .mockReturnValue({
        latestPoultryApplication: { reference: "POUL-1234-5678" },
        reference: "TEMP-CLAIM-REF-123",
        dateOfReview: "2024-01-15T10:30:00.000Z",
        herdId: "site-uuid-1234",
        herdName: "North Farm Site",
        herdCph: "12/345/6789",
        isOnlyHerdOnSbi: "yes",
        typesOfPoultry: ["laying hens"],
        minimumNumberOfBirds: "yes",
        vetsName: "John Smith",
        vetRCVSNumber: "1234567",
        biosecurity: "yes",
        biosecurityUsefulness: "very-useful",
        changesInBiosecurity: "infra-and-control",
        costOfChanges: "0-1500",
        interview: "yes",
      });

    setSessionData.mockImplementation(() => {});

    jest.spyOn(Wreck, "get").mockResolvedValue({
      payload: { herds: [] },
    });

    jest.spyOn(Wreck, "post").mockResolvedValue({
      payload: {
        reference: "PORE-CLAIM-1234",
        status: "SUBMITTED",
        data: { amount: 1000 },
      },
    });

    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.organisation)
      .mockReturnValue({
        sbi: "123456789",
        name: "Test Business",
      });

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

    test("renders page with correct back link", async () => {
      const options = {
        method: "GET",
        url,
        auth,
      };

      const res = await server.inject(options);

      expect(await axe(res.payload)).toHaveNoViolations();
      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      expect($(".govuk-back-link").attr("href")).toBe("/poultry/interview");
    });

    test("renders all 14 rows with data from session", async () => {
      const options = {
        method: "GET",
        url,
        auth,
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      expect($(".govuk-summary-list__row").length).toBe(14);
    });

    test("displays organisation name without change link", async () => {
      const options = {
        method: "GET",
        url,
        auth,
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      const orgRow = $(".govuk-summary-list__row").eq(0);
      expect(orgRow.find(".govuk-summary-list__key").text().trim()).toBe("Business Name");
      expect(orgRow.find(".govuk-summary-list__value").text().trim()).toBe("Test Business");
      expect(orgRow.find(".govuk-summary-list__actions a").length).toBe(0);
    });

    test("displays date of review in dd MMMM yyyy format without time component", async () => {
      const options = {
        method: "GET",
        url,
        auth,
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      const dateRow = $(".govuk-summary-list__row").eq(1);
      expect(dateRow.find(".govuk-summary-list__key").text().trim()).toBe("Date of review");
      expect(dateRow.find(".govuk-summary-list__value").text().trim()).toBe("15 January 2024");
      expect(dateRow.find(".govuk-summary-list__actions a").attr("href")).toBe(
        "/poultry/date-of-review",
      );
    });

    test("displays site name with change link for new site", async () => {
      const options = {
        method: "GET",
        url,
        auth,
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      const siteNameRow = $(".govuk-summary-list__row").eq(2);
      expect(siteNameRow.find(".govuk-summary-list__key").text().trim()).toBe("Site name");
      expect(siteNameRow.find(".govuk-summary-list__value").text().trim()).toBe("North Farm Site");
      expect(siteNameRow.find(".govuk-summary-list__actions a").attr("href")).toBe(
        "/poultry/enter-site-name",
      );
    });

    test("displays site name without change link for existing site", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          latestPoultryApplication: { reference: "POUL-1234-5678" },
          reference: "TEMP-CLAIM-REF-123",
          dateOfReview: "2024-01-15T10:30:00.000Z",
          herdId: "site-uuid-1234",
          herdName: "Existing Farm Site",
          herdCph: "12/345/6789",
          isOnlyHerdOnSbi: "yes",
          typesOfPoultry: ["laying hens"],
          minimumNumberOfBirds: "yes",
          vetsName: "John Smith",
          vetRCVSNumber: "1234567",
          biosecurity: "yes",
          biosecurityUsefulness: "very-useful",
          changesInBiosecurity: "infra-and-control",
          costOfChanges: "0-1500",
          interview: "yes",
        });

      Wreck.get.mockResolvedValue({ payload: { herds: [{ name: "Existing Farm Site" }] } });

      const options = {
        method: "GET",
        url,
        auth,
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      const siteNameRow = $(".govuk-summary-list__row").eq(2);
      expect(siteNameRow.find(".govuk-summary-list__key").text().trim()).toBe("Site name");
      expect(siteNameRow.find(".govuk-summary-list__value").text().trim()).toBe(
        "Existing Farm Site",
      );
      expect(siteNameRow.find(".govuk-summary-list__actions a").length).toBe(0);
    });

    test("displays site CPH with change link for new site", async () => {
      const options = {
        method: "GET",
        url,
        auth,
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      const cphRow = $(".govuk-summary-list__row").eq(3);
      expect(cphRow.find(".govuk-summary-list__key").text().trim()).toBe("Site CPH");
      expect(cphRow.find(".govuk-summary-list__value").text().trim()).toBe("12/345/6789");
      expect(cphRow.find(".govuk-summary-list__actions a").attr("href")).toBe(
        "/poultry/enter-cph-number",
      );
    });

    test("displays site CPH without change link for existing site", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          latestPoultryApplication: { reference: "POUL-1234-5678" },
          reference: "TEMP-CLAIM-REF-123",
          dateOfReview: "2024-01-15T10:30:00.000Z",
          herdId: "site-uuid-1234",
          herdName: "Existing Farm Site",
          herdCph: "98/765/4321",
          isOnlyHerdOnSbi: "yes",
          typesOfPoultry: ["laying hens"],
          minimumNumberOfBirds: "yes",
          vetsName: "John Smith",
          vetRCVSNumber: "1234567",
          biosecurity: "yes",
          biosecurityUsefulness: "very-useful",
          changesInBiosecurity: "infra-and-control",
          costOfChanges: "0-1500",
          interview: "yes",
        });

      Wreck.get.mockResolvedValue({ payload: { herds: [{ name: "Existing Farm Site" }] } });

      const options = {
        method: "GET",
        url,
        auth,
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      const cphRow = $(".govuk-summary-list__row").eq(3);
      expect(cphRow.find(".govuk-summary-list__key").text().trim()).toBe("Site CPH");
      expect(cphRow.find(".govuk-summary-list__value").text().trim()).toBe("98/765/4321");
      expect(cphRow.find(".govuk-summary-list__actions a").length).toBe(0);
    });

    test("displays only site within SBI with change link for new site", async () => {
      const options = {
        method: "GET",
        url,
        auth,
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      const siteOthersRow = $(".govuk-summary-list__row").eq(4);
      expect(siteOthersRow.find(".govuk-summary-list__key").text().trim()).toBe(
        "Only site within the SBI",
      );
      expect(siteOthersRow.find(".govuk-summary-list__value").text().trim()).toBe("Yes");
      expect(siteOthersRow.find(".govuk-summary-list__actions a").attr("href")).toBe(
        "/poultry/site-others-on-sbi",
      );
    });

    test("displays only site within SBI without change link for existing site", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          latestPoultryApplication: { reference: "POUL-1234-5678" },
          reference: "TEMP-CLAIM-REF-123",
          dateOfReview: "2024-01-15T10:30:00.000Z",
          herdId: "site-uuid-1234",
          herdName: "Existing Farm Site",
          herdCph: "12/345/6789",
          isOnlyHerdOnSbi: "no",
          typesOfPoultry: ["laying hens"],
          minimumNumberOfBirds: "yes",
          vetsName: "John Smith",
          vetRCVSNumber: "1234567",
          biosecurity: "yes",
          biosecurityUsefulness: "very-useful",
          changesInBiosecurity: "infra-and-control",
          costOfChanges: "0-1500",
          interview: "yes",
        });

      Wreck.get.mockResolvedValue({ payload: { herds: [{ name: "Existing Farm Site" }] } });

      const options = {
        method: "GET",
        url,
        auth,
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      const siteOthersRow = $(".govuk-summary-list__row").eq(4);
      expect(siteOthersRow.find(".govuk-summary-list__key").text().trim()).toBe(
        "Only site within the SBI",
      );
      expect(siteOthersRow.find(".govuk-summary-list__value").text().trim()).toBe("No");
      expect(siteOthersRow.find(".govuk-summary-list__actions a").length).toBe(0);
    });

    test("displays species with correct change link", async () => {
      const options = {
        method: "GET",
        url,
        auth,
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      const speciesRow = $(".govuk-summary-list__row").eq(5);
      expect(speciesRow.find(".govuk-summary-list__key").text().trim()).toBe("Species");
      expect(speciesRow.find(".govuk-summary-list__value").text().trim()).toBe("Laying hens");
      expect(speciesRow.find(".govuk-summary-list__actions a").attr("href")).toBe(
        "/poultry/select-poultry-type",
      );
    });

    test("displays multiple poultry types joined with comma", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          latestPoultryApplication: { reference: "POUL-1234-5678" },
          reference: "TEMP-CLAIM-REF-123",
          dateOfReview: "2024-01-15T10:30:00.000Z",
          herdId: "site-uuid-1234",
          herdName: "North Farm Site",
          herdCph: "12/345/6789",
          isOnlyHerdOnSbi: "yes",
          typesOfPoultry: ["laying hens", "broilers"],
          minimumNumberOfBirds: "yes",
          vetsName: "John Smith",
          vetRCVSNumber: "1234567",
          biosecurity: "yes",
          biosecurityUsefulness: "very-useful",
          changesInBiosecurity: "infra-and-control",
          costOfChanges: "0-1500",
          interview: "yes",
        });

      const options = {
        method: "GET",
        url,
        auth,
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      const speciesRow = $(".govuk-summary-list__row").eq(5);
      expect(speciesRow.find(".govuk-summary-list__value").text().trim()).toBe(
        "Laying hens, broilers",
      );
    });

    test("omits chickens from poultry types display", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          latestPoultryApplication: { reference: "POUL-1234-5678" },
          reference: "TEMP-CLAIM-REF-123",
          dateOfReview: "2024-01-15T10:30:00.000Z",
          herdId: "site-uuid-1234",
          herdName: "North Farm Site",
          herdCph: "12/345/6789",
          isOnlyHerdOnSbi: "yes",
          typesOfPoultry: ["chickens", "laying hens", "broilers"],
          minimumNumberOfBirds: "yes",
          vetsName: "John Smith",
          vetRCVSNumber: "1234567",
          biosecurity: "yes",
          biosecurityUsefulness: "very-useful",
          changesInBiosecurity: "infra-and-control",
          costOfChanges: "0-1500",
          interview: "yes",
        });

      const options = {
        method: "GET",
        url,
        auth,
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      const speciesRow = $(".govuk-summary-list__row").eq(5);
      expect(speciesRow.find(".govuk-summary-list__value").text().trim()).toBe(
        "Laying hens, broilers",
      );
    });

    test("displays minimum number of birds with correct change link", async () => {
      const options = {
        method: "GET",
        url,
        auth,
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      const minBirdsRow = $(".govuk-summary-list__row").eq(6);
      expect(minBirdsRow.find(".govuk-summary-list__key").text().trim()).toBe(
        "Minimum number of birds",
      );
      expect(minBirdsRow.find(".govuk-summary-list__value").text().trim()).toBe("Yes");
      expect(minBirdsRow.find(".govuk-summary-list__actions a").attr("href")).toBe(
        "/poultry/minimum-number-of-birds",
      );
    });

    test("displays vet's name with correct change link", async () => {
      const options = {
        method: "GET",
        url,
        auth,
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      const vetNameRow = $(".govuk-summary-list__row").eq(7);
      expect(vetNameRow.find(".govuk-summary-list__key").text().trim()).toBe("Vet's name");
      expect(vetNameRow.find(".govuk-summary-list__value").text().trim()).toBe("John Smith");
      expect(vetNameRow.find(".govuk-summary-list__actions a").attr("href")).toBe(
        "/poultry/vet-name",
      );
    });

    test("displays vet's RCVS number with correct change link", async () => {
      const options = {
        method: "GET",
        url,
        auth,
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      const vetRcvsRow = $(".govuk-summary-list__row").eq(8);
      expect(vetRcvsRow.find(".govuk-summary-list__key").text().trim()).toBe("Vet's RCVS number");
      expect(vetRcvsRow.find(".govuk-summary-list__value").text().trim()).toBe("1234567");
      expect(vetRcvsRow.find(".govuk-summary-list__actions a").attr("href")).toBe(
        "/poultry/vet-rcvs",
      );
    });

    test("displays biosecurity assessment with correct change link", async () => {
      const options = {
        method: "GET",
        url,
        auth,
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      const biosecurityRow = $(".govuk-summary-list__row").eq(9);
      expect(biosecurityRow.find(".govuk-summary-list__key").text().trim()).toBe(
        "Biosecurity assessment",
      );
      expect(biosecurityRow.find(".govuk-summary-list__value").text().trim()).toBe("Yes");
      expect(biosecurityRow.find(".govuk-summary-list__actions a").attr("href")).toBe(
        "/poultry/biosecurity",
      );
    });

    test("displays biosecurity usefulness with correct change link", async () => {
      const options = {
        method: "GET",
        url,
        auth,
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      const biosecurityUsefulnessRow = $(".govuk-summary-list__row").eq(10);
      expect(biosecurityUsefulnessRow.find(".govuk-summary-list__key").text().trim()).toBe(
        "Biosecurity usefulness",
      );
      expect(biosecurityUsefulnessRow.find(".govuk-summary-list__value").text().trim()).toBe(
        "Very useful",
      );
      expect(biosecurityUsefulnessRow.find(".govuk-summary-list__actions a").attr("href")).toBe(
        "/poultry/biosecurity-usefulness",
      );
    });

    test("displays biosecurity recommended changes with correct change link", async () => {
      const options = {
        method: "GET",
        url,
        auth,
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      const changesInBiosecurityRow = $(".govuk-summary-list__row").eq(11);
      expect(changesInBiosecurityRow.find(".govuk-summary-list__key").text().trim()).toBe(
        "Biosecurity recommended changes",
      );
      expect(changesInBiosecurityRow.find(".govuk-summary-list__value").text().trim()).toBe(
        "Housing, buildings, infrastructure, and wild bird control",
      );
      expect(changesInBiosecurityRow.find(".govuk-summary-list__actions a").attr("href")).toBe(
        "/poultry/changes-in-biosecurity",
      );
    });

    test("displays expected cost for biosecurity changes with correct change link", async () => {
      const options = {
        method: "GET",
        url,
        auth,
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      const costOfChangesRow = $(".govuk-summary-list__row").eq(12);
      expect(costOfChangesRow.find(".govuk-summary-list__key").text().trim()).toBe(
        "Expected cost for biosecurity changes",
      );
      expect(costOfChangesRow.find(".govuk-summary-list__value").text().trim()).toBe(
        "Up to £1,500",
      );
      expect(costOfChangesRow.find(".govuk-summary-list__actions a").attr("href")).toBe(
        "/poultry/cost-of-changes",
      );
    });

    test("displays evaluation interview with correct change link", async () => {
      const options = {
        method: "GET",
        url,
        auth,
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      const interviewRow = $(".govuk-summary-list__row").eq(13);
      expect(interviewRow.find(".govuk-summary-list__key").text().trim()).toBe(
        "Evaluation interview",
      );
      expect(interviewRow.find(".govuk-summary-list__value").text().trim()).toBe("Yes");
      expect(interviewRow.find(".govuk-summary-list__actions a").attr("href")).toBe(
        "/poultry/interview",
      );
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
        payload: { crumb },
        headers: { cookie: `crumb=${crumb}` },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location.toString()).toEqual("/sign-in");
    });

    test("submits claim and redirects to confirmation page", async () => {
      const options = {
        method: "POST",
        url,
        auth,
        payload: { crumb },
        headers: { cookie: `crumb=${crumb}` },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toEqual("/poultry/confirmation");
      expect(Wreck.post).toHaveBeenCalledTimes(1);
    });

    test("submits claim with correct payload structure", async () => {
      const options = {
        method: "POST",
        url,
        auth,
        payload: { crumb },
        headers: { cookie: `crumb=${crumb}` },
      };

      await server.inject(options);

      expect(Wreck.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          payload: {
            applicationReference: "POUL-1234-5678",
            reference: "TEMP-CLAIM-REF-123",
            type: "REVIEW",
            createdBy: "admin",
            data: {
              dateOfReview: "2024-01-15T10:30:00.000Z",
              site: {
                id: "site-uuid-1234",
                version: 1,
                name: "North Farm Site",
                cph: "12/345/6789",
                same: "yes",
              },
              typesOfPoultry: ["laying hens"],
              minimumNumberOfBirds: "yes",
              vetsName: "John Smith",
              vetRCVSNumber: "1234567",
              biosecurity: "yes",
              biosecurityUsefulness: "very-useful",
              changesInBiosecurity: "infra-and-control",
              costOfChanges: "0-1500",
              interview: "yes",
            },
          },
        }),
      );
    });

    test("omits chickens from typesOfPoultry in claim payload", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          latestPoultryApplication: { reference: "POUL-1234-5678" },
          reference: "TEMP-CLAIM-REF-123",
          dateOfReview: "2024-01-15T10:30:00.000Z",
          herdId: "site-uuid-1234",
          herdName: "North Farm Site",
          herdCph: "12/345/6789",
          isOnlyHerdOnSbi: "yes",
          typesOfPoultry: ["chickens", "laying hens", "broilers"],
          minimumNumberOfBirds: "yes",
          vetsName: "John Smith",
          vetRCVSNumber: "1234567",
          biosecurity: "yes",
          biosecurityUsefulness: "very-useful",
          changesInBiosecurity: "infra-and-control",
          costOfChanges: "0-1500",
          interview: "yes",
        });

      const options = {
        method: "POST",
        url,
        auth,
        payload: { crumb },
        headers: { cookie: `crumb=${crumb}` },
      };

      await server.inject(options);

      expect(Wreck.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          payload: expect.objectContaining({
            data: expect.objectContaining({
              typesOfPoultry: ["laying hens", "broilers"],
            }),
          }),
        }),
      );
    });

    test("sets session data with claim reference after successful submission", async () => {
      const options = {
        method: "POST",
        url,
        auth,
        payload: { crumb },
        headers: { cookie: `crumb=${crumb}` },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(302);
      expect(setSessionData).toHaveBeenCalledWith(
        res.request,
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.reference,
        "PORE-CLAIM-1234",
      );
    });

    test("sets session data with claim amount after successful submission", async () => {
      const options = {
        method: "POST",
        url,
        auth,
        payload: { crumb },
        headers: { cookie: `crumb=${crumb}` },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(302);
      expect(setSessionData).toHaveBeenCalledWith(
        res.request,
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.amount,
        1000,
      );
    });
  });
});

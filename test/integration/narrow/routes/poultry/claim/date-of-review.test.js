import * as cheerio from "cheerio";
import { axe } from "../../../../../helpers/axe-helper.js";
import { config } from "../../../../../../app/config/index.js";
import { createServer } from "../../../../../../app/server.js";
import expectPhaseBanner from "assert";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../../../../../app/session/index.js";
import { trackEvent } from "../../../../../../app/logging/logger.js";
import { getSites } from "../../../../../../app/api-requests/application-api.js";
import { sendInvalidDataPoultryEvent } from "../../../../../../app/messaging/ineligibility-event-emission.js";
import {
  refreshApplications,
  resetPoultryClaimSession,
} from "../../../../../../app/lib/context-helper.js";
import { when } from "jest-when";
import { getCrumbs } from "../../../../../utils/get-crumbs.js";

jest.mock("../../../../../../app/session/index.js");
jest.mock("../../../../../../app/messaging/ineligibility-event-emission.js");
jest.mock("../../../../../../app/api-requests/application-api.js");
jest.mock("../../../../../../app/lib/context-helper.js");
jest.mock("../../../../../../app/logging/logger.js", () => ({
  ...jest.requireActual("../../../../../../app/logging/logger.js"),
  trackEvent: jest.fn(),
}));

config.poultry.enabled = true;

const auth = { credentials: {}, strategy: "cookie" };
const url = "/poultry/date-of-visit";

function expectPageContentOk($, previousPageUrl) {
  expect($("title").text()).toMatch(
    "Date of visit - Get funding to improve animal health and welfare",
  );
  expect($("h1").text().trim()).toMatch("Date of visit");
  expect($("p").text()).toMatch("This is the date the vet last visited the site for this review.");
  expect($("#visit-date-hint").text()).toMatch("For example, 27 3 2022");
  expect($(`label[for=visit-date-day]`).text()).toMatch("Day");
  expect($(`label[for=visit-date-month]`).text()).toMatch("Month");
  expect($(`label[for=visit-date-year]`).text()).toMatch("Year");
  expect($(".govuk-button").text()).toMatch("Continue");
  const backLink = $(".govuk-back-link");
  expect(backLink.text()).toMatch("Back");
  expect(backLink.attr("href")).toMatch(previousPageUrl);
}

describe("GET /poultry/date-of-visit", () => {
  let server;

  const mockOrganisation = { sbi: "123456789", name: "Test Farm" };
  const mockLatestPoultryApplication = { status: "AGREED", reference: "AHWR-POUL-1234" };

  beforeAll(async () => {
    server = await createServer();
    await server.initialize();

    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
      .mockReturnValue({});

    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.organisation)
      .mockReturnValue(mockOrganisation);

    when(getSessionData)
      .calledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.latestPoultryApplication,
      )
      .mockReturnValue(mockLatestPoultryApplication);

    when(getSessionData)
      .calledWith(
        expect.anything(),
        sessionEntryKeys.confirmedDetails,
        sessionKeys.confirmedDetails,
      )
      .mockReturnValue(true);

    refreshApplications.mockResolvedValue({
      latestPoultryApplication: mockLatestPoultryApplication,
    });
    resetPoultryClaimSession.mockResolvedValue();
  });

  afterAll(async () => {
    await server.stop();
    jest.resetAllMocks();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    getSessionData.mockReset();

    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
      .mockReturnValue({});

    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.organisation)
      .mockReturnValue(mockOrganisation);

    when(getSessionData)
      .calledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.latestPoultryApplication,
      )
      .mockReturnValue(mockLatestPoultryApplication);

    when(getSessionData)
      .calledWith(
        expect.anything(),
        sessionEntryKeys.confirmedDetails,
        sessionKeys.confirmedDetails,
      )
      .mockReturnValue(true);

    refreshApplications.mockResolvedValue({
      latestPoultryApplication: mockLatestPoultryApplication,
    });
    resetPoultryClaimSession.mockResolvedValue();
  });

  const options = {
    method: "GET",
    url,
    auth,
  };

  test("If there is no agreement, it gets redirected to create one", async () => {
    when(getSessionData)
      .calledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.latestPoultryApplication,
      )
      .mockReturnValue({});

    const res = await server.inject(options);
    expect(res.statusCode).toBe(302);
    expect(res.headers.location.toString()).toEqual(`/poultry/you-can-claim-multiple`);
  });

  test("without previous data, shows the screen with empty date boxes", async () => {
    const res = await server.inject(options);

    expect(await axe(res.payload)).toHaveNoViolations();
    expect(res.statusCode).toBe(200);
    const $ = cheerio.load(res.payload);
    expectPageContentOk($, "/poultry/vet-visits");
    expectPhaseBanner.ok($);
  });

  test("calls refreshApplications with organisation sbi", async () => {
    await server.inject({ ...options, url: url + "?journey=new" });

    expect(refreshApplications).toHaveBeenCalledWith(mockOrganisation.sbi, expect.anything());
  });

  test("calls resetPoultryClaimSession with application reference", async () => {
    await server.inject({ ...options, url: url + "?journey=new" });

    expect(resetPoultryClaimSession).toHaveBeenCalledWith(
      expect.anything(),
      mockLatestPoultryApplication.reference,
    );
  });

  test("displays previously entered date of review", async () => {
    const previousDate = new Date(2025, 2, 15);
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
      .mockReturnValue({ dateOfVisit: previousDate });

    const res = await server.inject(options);

    expect(res.statusCode).toBe(200);
    const $ = cheerio.load(res.payload);
    expect($("#visit-date-day").val()).toBe("15");
    expect($("#visit-date-month").val()).toBe("3");
    expect($("#visit-date-year").val()).toBe("2025");
  });
});

describe("POST /poultry/date-of-visit", () => {
  let server;
  let crumb;

  beforeAll(async () => {
    server = await createServer();
    await server.initialize();

    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
      .mockReturnValue({});

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

  beforeEach(async () => {
    crumb = await getCrumbs(server);
  });

  afterAll(async () => {
    await server.stop();
    jest.resetAllMocks();
  });

  test("when adding a correct date and sites exist, redirects to select-the-site", async () => {
    getSites.mockResolvedValue({ herds: [{ id: "1", name: "Site 1" }] });

    const options = {
      method: "POST",
      url,
      payload: {
        crumb,
        "visit-date-day": "21",
        "visit-date-month": "01",
        "visit-date-year": "2025",
      },
      auth,
      headers: { cookie: `crumb=${crumb}` },
    };
    const res = await server.inject(options);

    expect(res.statusCode).toBe(302);
    expect(res.headers.location.toString()).toEqual("/poultry/select-the-site");
    expect(setSessionData).toHaveBeenCalledWith(
      expect.anything(),
      sessionEntryKeys.poultryClaim,
      sessionKeys.poultryClaim.dateOfVisit,
      new Date(2025, 0, 21),
    );
  });

  test("when adding a correct date and no sites exist, redirects to enter-site-name", async () => {
    getSites.mockResolvedValue({ herds: [] });

    const options = {
      method: "POST",
      url,
      payload: {
        crumb,
        "visit-date-day": "21",
        "visit-date-month": "01",
        "visit-date-year": "2025",
      },
      auth,
      headers: { cookie: `crumb=${crumb}` },
    };
    const res = await server.inject(options);

    expect(res.statusCode).toBe(302);
    expect(res.headers.location.toString()).toEqual("/poultry/enter-site-name");
    expect(setSessionData).toHaveBeenCalledWith(
      expect.anything(),
      sessionEntryKeys.poultryClaim,
      sessionKeys.poultryClaim.dateOfVisit,
      new Date(2025, 0, 21),
    );
  });

  test.each([
    {
      description: "empty values",
      day: "",
      month: "",
      year: "",
      expectedError: "Enter a date in the boxes below",
    },
    {
      description: "non-numeric day",
      day: "abc",
      month: "01",
      year: "2025",
      expectedError: "Enter a date in the boxes below",
    },
    {
      description: "non-numeric month",
      day: "21",
      month: "abc",
      year: "2025",
      expectedError: "Enter a date in the boxes below",
    },
    {
      description: "non-numeric year",
      day: "21",
      month: "01",
      year: "abc",
      expectedError: "Enter a date in the boxes below",
    },
    {
      description: "invalid day (32)",
      day: "32",
      month: "01",
      year: "2025",
      expectedError: "Enter a date in the boxes below",
    },
    {
      description: "invalid month (13)",
      day: "21",
      month: "13",
      year: "2025",
      expectedError: "Enter a date in the boxes below",
    },
    {
      description: "invalid date (Feb 30)",
      day: "30",
      month: "02",
      year: "2025",
      expectedError: "The date of review must be a real date",
    },
    {
      description: "missing day",
      day: "",
      month: "01",
      year: "2025",
      expectedError: "Enter a date in the boxes below",
    },
  ])(
    "when adding invalid date ($description), shows error",
    async ({ day, month, year, expectedError }) => {
      const options = {
        method: "POST",
        url,
        payload: {
          crumb,
          "visit-date-day": day,
          "visit-date-month": month,
          "visit-date-year": year,
        },
        auth,
        headers: { cookie: `crumb=${crumb}` },
      };
      const res = await server.inject(options);

      expect(res.statusCode).toBe(400);

      const $ = cheerio.load(res.payload);
      expect($("h1").text().trim()).toBe("Date of visit");
      expect($(".govuk-error-summary")).toHaveLength(1);
      expect($(".govuk-error-summary").text()).toContain(expectedError);
      expect($(".govuk-back-link").attr("href")).toBe("/poultry/vet-visits");
    },
  );

  test("when date is in the future, shows error", async () => {
    const futureYear = new Date().getFullYear() + 1;
    const options = {
      method: "POST",
      url,
      payload: {
        crumb,
        "visit-date-day": "15",
        "visit-date-month": "06",
        "visit-date-year": String(futureYear),
      },
      auth,
      headers: { cookie: `crumb=${crumb}` },
    };
    const res = await server.inject(options);

    expect(res.statusCode).toBe(400);

    const $ = cheerio.load(res.payload);
    expect($("h1").text().trim()).toBe("Date of visit");
    expect($(".govuk-error-summary")).toHaveLength(1);
    expect($(".govuk-error-summary").text()).toContain(
      "The date of review must be today or in the past",
    );
    expect($(".govuk-back-link").attr("href")).toBe("/poultry/vet-visits");
  });

  test("when date is before latestPoultryApplication.createdAt, shows error and calls trackEvent and sendInvalidDataPoultryEvent", async () => {
    const createdAt = "2025-03-01";
    when(getSessionData)
      .calledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.latestPoultryApplication,
      )
      .mockReturnValue({ status: "AGREED", createdAt });

    const options = {
      method: "POST",
      url,
      payload: {
        crumb,
        "visit-date-day": "15",
        "visit-date-month": "01",
        "visit-date-year": "2025",
      },
      auth,
      headers: { cookie: `crumb=${crumb}` },
    };
    const res = await server.inject(options);

    expect(res.statusCode).toBe(400);
    expect(trackEvent).toHaveBeenCalled();

    const expectedError =
      "The date the biosecurity review happened must be on or after 1 March 2025, the date your agreement started";

    expect(sendInvalidDataPoultryEvent).toHaveBeenCalled();

    const $ = cheerio.load(res.payload);
    expect($("h1").text().trim()).toBe("Date of visit");
    expect($(".govuk-error-summary")).toHaveLength(1);
    expect($(".govuk-error-summary").text()).toContain(expectedError);
    expect($(".govuk-back-link").attr("href")).toBe("/poultry/vet-visits");
  });

  test("when date is the same day as latestPoultryApplication.createdAt (with time component), should succeed", async () => {
    const createdAt = "2025-03-01T14:30:00Z";
    when(getSessionData)
      .calledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.latestPoultryApplication,
      )
      .mockReturnValue({ status: "AGREED", createdAt, reference: "TEST-REF" });

    getSites.mockResolvedValue({ herds: [] });

    const options = {
      method: "POST",
      url,
      payload: {
        crumb,
        "visit-date-day": "1",
        "visit-date-month": "03",
        "visit-date-year": "2025",
      },
      auth,
      headers: { cookie: `crumb=${crumb}` },
    };
    const res = await server.inject(options);

    expect(res.statusCode).toBe(302);
    expect(res.headers.location.toString()).toEqual("/poultry/enter-site-name");
  });
});

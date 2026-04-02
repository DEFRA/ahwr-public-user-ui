import * as cheerio from "cheerio";
import { axe } from "../../../../../helpers/axe-helper.js";
import { config } from "../../../../../../app/config/index.js";
import { createServer } from "../../../../../../app/server";
import expectPhaseBanner from "assert";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../../../../../app/session";
import { sendInvalidDataEvent } from "../../../../../../app/messaging/ineligibility-event-emission.js";
import { when } from "jest-when";
import { getCrumbs } from "../../../../../utils/get-crumbs.js";

jest.mock("../../../../../../app/messaging/ineligibility-event-emission.js");
jest.mock("../../../../../../app/session");

config.poultry.enabled = true;

const auth = { credentials: {}, strategy: "cookie" };
const url = "/poultry/date-of-review";

function expectPageContentOk($, previousPageUrl) {
  expect($("title").text()).toMatch(
    "Date of review - Get funding to improve animal health and welfare",
  );
  expect($("h1").text().trim()).toMatch("Date of review");
  expect($("p").text()).toMatch("This is the date the vet last visited the site for this review.");
  expect($("#review-date-hint").text()).toMatch("For example, 27 3 2022");
  expect($(`label[for=review-date-day]`).text()).toMatch("Day");
  expect($(`label[for=review-date-month]`).text()).toMatch("Month");
  expect($(`label[for=review-date-year]`).text()).toMatch("Year");
  expect($(".govuk-button").text()).toMatch("Continue");
  const backLink = $(".govuk-back-link");
  expect(backLink.text()).toMatch("Back");
  expect(backLink.attr("href")).toMatch(previousPageUrl);
}

describe("GET /poultry/date-of-review", () => {
  let server;

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

  afterAll(async () => {
    await server.stop();
    jest.resetAllMocks();
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
    when(getSessionData)
      .calledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.latestPoultryApplication,
      )
      .mockReturnValue({ status: "AGREED" });

    const res = await server.inject(options);

    expect(await axe(res.payload)).toHaveNoViolations();
    expect(res.statusCode).toBe(200);
    const $ = cheerio.load(res.payload);
    expectPageContentOk($, "/vet-visits");
    expectPhaseBanner.ok($);
  });
});

describe("POST /poultry/date-of-review", () => {
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

  test("when adding a correct date, we redirect to the same page", async () => {
    const options = {
      method: "POST",
      url,
      payload: {
        crumb,
        "review-date-day": "21",
        "review-date-month": "01",
        "review-date-year": "2025",
      },
      auth,
      headers: { cookie: `crumb=${crumb}` },
    };
    const res = await server.inject(options);

    expect(res.statusCode).toBe(302);
    expect(res.headers.location.toString()).toEqual(`/poultry/you-can-claim-multiple`);
    expect(setSessionData).toHaveBeenCalledWith(
      expect.anything(),
      sessionEntryKeys.poultryClaim,
      sessionKeys.poultryClaim.dateOfReview,
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
    "when adding invalid date ($description), shows error and calls sendInvalidDataEvent",
    async ({ day, month, year, expectedError }) => {
      const options = {
        method: "POST",
        url,
        payload: {
          crumb,
          "review-date-day": day,
          "review-date-month": month,
          "review-date-year": year,
        },
        auth,
        headers: { cookie: `crumb=${crumb}` },
      };
      const res = await server.inject(options);

      expect(res.statusCode).toBe(400);
      expect(sendInvalidDataEvent).toHaveBeenCalled();

      const $ = cheerio.load(res.payload);
      expect($("h1").text().trim()).toBe("Date of review");
      expect($(".govuk-error-summary")).toHaveLength(1);
      expect($(".govuk-error-summary").text()).toContain(expectedError);
      expect($("#back").attr("href")).toBe("/vet-visits");
    },
  );

  test("when date is before latestPoultryApplication.createdAt, shows error", async () => {
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
        "review-date-day": "15",
        "review-date-month": "01",
        "review-date-year": "2025",
      },
      auth,
      headers: { cookie: `crumb=${crumb}` },
    };
    const res = await server.inject(options);

    expect(res.statusCode).toBe(400);
    expect(sendInvalidDataEvent).toHaveBeenCalled();

    const expectedError =
      "The date the biosecurity review happened must be on or after 1 March 2025, the date your agreement started";

    const $ = cheerio.load(res.payload);
    expect($("h1").text().trim()).toBe("Date of review");
    expect($(".govuk-error-summary")).toHaveLength(1);
    expect($(".govuk-error-summary").text()).toContain(expectedError);
    expect($("#back").attr("href")).toBe("/vet-visits");
  });
});

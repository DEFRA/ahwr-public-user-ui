import * as cheerio from "cheerio";
import { createServer } from "../../../../../app/server.js";
import expectPhaseBanner from "assert";
import { getCrumbs } from "../../../../utils/get-crumbs.js";
import { getHerds } from "../../../../../app/api-requests/application-api.js";
import {
  getSessionData,
  sessionEntryKeys,
  setSessionData,
} from "../../../../../app/session/index.js";
import { previousPageUrl } from "../../../../../app/routes/claim/date-of-visit.js";
import { when } from "jest-when";
import { sendInvalidDataEvent } from "../../../../../app/messaging/ineligibility-event-emission.js";
import { trackEvent } from "../../../../../app/logging/logger.js";

jest.mock("../../../../../app/session");
jest.mock("../../../../../app/messaging/ineligibility-event-emission.js");
jest.mock("../../../../../app/api-requests/application-api.js");
jest.mock("../../../../../app/logging/logger.js", () => ({
  ...jest.requireActual("../../../../../app/logging/logger.js"),
  trackEvent: jest.fn(),
}));

function expectPageContentOk($, previousPageUrl) {
  expect($("title").text()).toMatch(
    /Date of review|follow-up - Get funding to improve animal health and welfare/i,
  );
  expect($("h1").text().trim()).toMatch(/(Date of review | follow-up)/i);
  expect($("p").text()).toMatch(
    /(This is the date the vet last visited the farm for this review. You can find it on the summary the vet gave you.| follow-up)/i,
  );
  expect($("#visit-date-hint").text()).toMatch("For example, 27 3 2022");
  expect($(`label[for=visit-date-day]`).text()).toMatch("Day");
  expect($(`label[for=visit-date-month]`).text()).toMatch("Month");
  expect($(`label[for=visit-date-year]`).text()).toMatch("Year");
  expect($(".govuk-button").text()).toMatch("Continue");
  const backLink = $(".govuk-back-link");
  expect(backLink.text()).toMatch("Back");
  expect(backLink.attr("href")).toMatch(previousPageUrl);
}

const latestVetVisitApplication = {
  reference: "AHWR-2470-6BA9",
  createdAt: new Date("2023/01/01"),
  data: {
    visitDate: "2023-01-01",
    whichReview: "beef",
  },
  status: "AGREED",
  type: "VV",
};

const latestEndemicsApplication = {
  reference: "AHWR-2470-6BA9",
  createdAt: new Date("2025/01/01"),
  status: "AGREED",
  type: "EE",
};

const auth = { credentials: {}, strategy: "cookie" };
const url = "/date-of-visit";

describe("GET /date-of-visit handler", () => {
  let server;

  beforeAll(async () => {
    server = await createServer();
    await server.initialize();
    getSessionData.mockImplementation(() => {
      return {
        latestVetVisitApplication,
        latestEndemicsApplication,
      };
    });
  });

  afterAll(async () => {
    await server.stop();
    jest.resetAllMocks();
  });

  test("returns 200 when you dont have any previous claims", async () => {
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
      .mockReturnValue({
        latestEndemicsApplication,
        latestVetVisitApplication,
        typeOfReview: "endemics",
        typeOfLivestock: "beef",
        previousClaims: [],
        reference: "TEMP-6GSE-PIR8",
      });
    const options = {
      method: "GET",
      url,
      auth,
    };

    const res = await server.inject(options);

    expect(res.statusCode).toBe(200);
    const $ = cheerio.load(res.payload);
    expectPageContentOk($, "/which-type-of-review");
    expectPhaseBanner.ok($);
  });

  test("returns 200 when you do have previous claims", async () => {
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
      .mockReturnValue({
        latestEndemicsApplication,
        latestVetVisitApplication,
        typeOfReview: "endemics",
        typeOfLivestock: "beef",
        previousClaims: [
          {
            data: {
              typeOfReview: "REVIEW",
            },
          },
        ],
        reference: "TEMP-6GSE-PIR8",
      });
    const options = {
      method: "GET",
      url,
      auth,
    };

    const res = await server.inject(options);

    expect(res.statusCode).toBe(200);
    const $ = cheerio.load(res.payload);
    expectPageContentOk($, "/which-type-of-review");
    expectPhaseBanner.ok($);
  });

  test("returns 200 and fills input with value in session", async () => {
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
      .mockReturnValue({
        latestEndemicsApplication,
        latestVetVisitApplication,
        typeOfReview: "endemics",
        typeOfLivestock: "beef",
        previousClaims: [
          {
            data: {
              typeOfReview: "REVIEW",
            },
          },
        ],
        dateOfVisit: "2024-05-01",
        reference: "TEMP-6GSE-PIR8",
      });
    const options = {
      method: "GET",
      url,
      auth,
    };

    const res = await server.inject(options);

    expect(res.statusCode).toBe(200);
    const $ = cheerio.load(res.payload);
    expect($("#visit-date-day")[0].attribs.value).toEqual("1");
    expect($("#visit-date-month")[0].attribs.value).toEqual("5");
    expect($("#visit-date-year")[0].attribs.value).toEqual("2024");
    expectPageContentOk($, "/which-type-of-review");
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

describe("POST /date-of-visit handler", () => {
  let server;

  beforeAll(async () => {
    server = await createServer();
    await server.initialize();
  });

  afterAll(async () => {
    await server.stop();
    jest.resetAllMocks();
  });

  let crumb;

  beforeEach(async () => {
    crumb = await getCrumbs(server);
    jest.clearAllMocks();
  });

  test("redirect back to page with errors if the entered date is of an incorrect format", async () => {
    // unhappy path
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
      .mockReturnValue({
        typeOfReview: "REVIEW",
        previousClaims: [],
        typeOfLivestock: "beef",
        organisation: {
          name: "Farmer Johns",
          sbi: "12345",
        },
        reviewTestResults: "positive",
        reference: "TEMP-6GSE-PIR8",
        latestEndemicsApplication,
      });
    const options = {
      method: "POST",
      url,
      payload: {
        crumb,
        "visit-date-day": "second",
        "visit-date-month": "february",
        "visit-date-year": "2000",
      },
      auth,
      headers: { cookie: `crumb=${crumb}` },
    };

    const res = await server.inject(options);

    const $ = cheerio.load(res.payload);
    expect(res.statusCode).toBe(400);
    expect($(".govuk-error-summary__list > li > a").text().trim()).toEqual(
      "Enter the date of review",
    );
    expect(trackEvent).toHaveBeenCalledWith(
      expect.any(Object),
      "claim-invalid-date-of-visit",
      "review",
      {
        kind: "dateEntered: 2000-february-second, dateOfAgreement: 2025-01-01",
        reason: "Enter the date of review",
        reference: "TEMP-6GSE-PIR8",
      },
    );
  });

  test("redirect back to page with errors if the entered date is of a correct format, but the date isn't real", async () => {
    // unhappy path
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
      .mockReturnValue({
        typeOfReview: "REVIEW",
        previousClaims: [],
        typeOfLivestock: "beef",
        organisation: {
          name: "Farmer Johns",
          sbi: "12345",
        },
        reviewTestResults: "positive",
        reference: "TEMP-6GSE-PIR8",
        latestEndemicsApplication,
      });
    const options = {
      method: "POST",
      url,
      payload: {
        crumb,
        "visit-date-day": "31",
        "visit-date-month": "2",
        "visit-date-year": "2025",
      },
      auth,
      headers: { cookie: `crumb=${crumb}` },
    };

    const res = await server.inject(options);

    const $ = cheerio.load(res.payload);
    expect(res.statusCode).toBe(400);
    expect($(".govuk-error-summary__list > li > a").text().trim()).toEqual(
      "The date of review must be a real date",
    );
    expect(trackEvent).toHaveBeenCalledWith(
      expect.any(Object),
      "claim-invalid-date-of-visit",
      "review",
      {
        kind: "dateEntered: 2025-2-31, dateOfAgreement: 2025-01-01",
        reason: "The date of review must be a real date",
        reference: "TEMP-6GSE-PIR8",
      },
    );
  });

  test("redirect back to page with errors if the entered date is before the agreement date", async () => {
    // unhappy path
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
      .mockReturnValue({
        typeOfReview: "REVIEW",
        previousClaims: [],
        typeOfLivestock: "beef",
        organisation: {
          name: "Farmer Johns",
          sbi: "12345",
        },
        reviewTestResults: "positive",
        reference: "TEMP-6GSE-PIR8",
        latestEndemicsApplication,
      });
    const options = {
      method: "POST",
      url,
      payload: {
        crumb,
        "visit-date-day": "1",
        "visit-date-month": "12",
        "visit-date-year": "2024",
      },
      auth,
      headers: { cookie: `crumb=${crumb}` },
    };

    const res = await server.inject(options);

    const $ = cheerio.load(res.payload);
    expect(res.statusCode).toBe(400);
    expect($(".govuk-error-summary__list > li > a").text().trim()).toEqual(
      "The date of review must be the same as or after the date of your agreement",
    );
    expect(trackEvent).toHaveBeenCalledWith(
      expect.any(Object),
      "claim-invalid-date-of-visit",
      "review",
      {
        kind: "dateEntered: 2024-12-1, dateOfAgreement: 2025-01-01",
        reason: "The date of review must be the same as or after the date of your agreement",
        reference: "TEMP-6GSE-PIR8",
      },
    );
  });

  test("redirect back to page with errors if the entered date is in the future", async () => {
    // unhappy path
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
      .mockReturnValue({
        typeOfReview: "REVIEW",
        previousClaims: [],
        typeOfLivestock: "beef",
        organisation: {
          name: "Farmer Johns",
          sbi: "12345",
        },
        reviewTestResults: "positive",
        reference: "TEMP-6GSE-PIR8",
        latestEndemicsApplication,
      });
    const options = {
      method: "POST",
      url,
      payload: {
        crumb,
        "visit-date-day": "2",
        "visit-date-month": "2",
        "visit-date-year": "2040",
      },
      auth,
      headers: { cookie: `crumb=${crumb}` },
    };

    const res = await server.inject(options);

    const $ = cheerio.load(res.payload);
    expect(res.statusCode).toBe(400);
    expect($(".govuk-error-summary__list > li > a").text().trim()).toEqual(
      "The date of review must be today or in the past",
    );
    expect(trackEvent).toHaveBeenCalledWith(
      expect.any(Object),
      "claim-invalid-date-of-visit",
      "review",
      {
        kind: "dateEntered: 2040-2-2, dateOfAgreement: 2025-01-01",
        reason: "The date of review must be today or in the past",
        reference: "TEMP-6GSE-PIR8",
      },
    );
  });

  test("user makes a review claim and has zero previous claims", async () => {
    // happy path
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
      .mockReturnValue({
        typeOfReview: "REVIEW",
        previousClaims: [],
        typeOfLivestock: "beef",
        organisation: {
          name: "Farmer Johns",
          sbi: "12345",
        },
        reviewTestResults: "positive",
        reference: "TEMP-6GSE-PIR8",
        latestEndemicsApplication,
        dateOfVisit: "2025-01-01",
      });
    const options = {
      method: "POST",
      url,
      payload: {
        crumb,
        "visit-date-day": "01",
        "visit-date-month": "01",
        "visit-date-year": "2025",
      },
      auth,
      headers: { cookie: `crumb=${crumb}` },
    };

    const res = await server.inject(options);

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/date-of-testing");
    expect(setSessionData).toHaveBeenCalledWith(
      expect.any(Object),
      "endemicsClaim",
      "dateOfVisit",
      new Date(2025, 0, 1),
    );
    expect(trackEvent).not.toHaveBeenCalled();
  });

  test("user makes a review claim and created an application on the same day", async () => {
    // happy path
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
      .mockReturnValue({
        typeOfReview: "REVIEW",
        previousClaims: [],
        typeOfLivestock: "beef",
        organisation: {
          name: "Farmer Johns",
          sbi: "12345",
        },
        reviewTestResults: "positive",
        reference: "TEMP-6GSE-PIR8",
        latestEndemicsApplication: {
          ...latestEndemicsApplication,
          createdAt: new Date("2025/01/01 14:30:00"),
        },
        dateOfVisit: "2025-01-01",
      });
    const options = {
      method: "POST",
      url,
      payload: {
        crumb,
        "visit-date-day": "01",
        "visit-date-month": "01",
        "visit-date-year": "2025",
      },
      auth,
      headers: { cookie: `crumb=${crumb}` },
    };

    const res = await server.inject(options);

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/date-of-testing");
    expect(setSessionData).toHaveBeenCalledWith(
      expect.any(Object),
      "endemicsClaim",
      "dateOfVisit",
      new Date(2025, 0, 1),
    );
    expect(trackEvent).not.toHaveBeenCalledWith();
  });

  test("user makes a review claim and has a previous review claim for the same species within the last 10 months", async () => {
    // unhappy path
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
      .mockReturnValue({
        typeOfReview: "REVIEW",
        previousClaims: [
          {
            reference: "REBC-C2EA-C718",
            applicationReference: "AHWR-2470-6BA9",
            status: "AGREED",
            type: "REVIEW",
            createdAt: "2024-12-12T10:25:11.318Z",
            data: {
              typeOfLivestock: "beef",
              dateOfVisit: "2024-12-12",
            },
          },
        ],
        typeOfLivestock: "beef",
        organisation: {
          name: "Farmer Johns",
          sbi: "12345",
        },
        reviewTestResults: "positive",
        reference: "TEMP-6GSE-PIR8",
        latestEndemicsApplication,
        dateOfVisit: "2025-01-01",
      });
    const options = {
      method: "POST",
      url,
      payload: {
        crumb,
        "visit-date-day": "01",
        "visit-date-month": "01",
        "visit-date-year": "2025",
      },
      auth,
      headers: { cookie: `crumb=${crumb}` },
    };

    const res = await server.inject(options);

    const $ = cheerio.load(res.payload);

    expect(res.statusCode).toBe(400);
    expect($("h1").text().trim()).toMatch("You cannot continue with your claim");
    expect(sendInvalidDataEvent).toHaveBeenCalled();

    expect(setSessionData).toHaveBeenCalledWith(
      expect.any(Object),
      "endemicsClaim",
      "dateOfVisit",
      new Date(2025, 0, 1),
    );
    expect(trackEvent).toHaveBeenCalledWith(
      expect.any(Object),
      "claim-invalid-date-of-visit",
      "review",
      {
        kind: "Wed Jan 01 2025 00:00:00 GMT+0000 (Greenwich Mean Time) is invalid",
        reason: "There must be at least 10 months between your reviews.",
        reference: "TEMP-6GSE-PIR8",
      },
    );
  });

  test("user makes a review claim and has a previous review claim for the same species over 10 months ago", async () => {
    // happy path
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
      .mockReturnValue({
        typeOfReview: "REVIEW",
        previousClaims: [
          {
            reference: "REBC-C2EA-C718",
            applicationReference: "AHWR-2470-6BA9",
            status: "AGREED",
            type: "REVIEW",
            createdAt: "2024-12-12T10:25:11.318Z",
            data: {
              typeOfLivestock: "beef",
              dateOfVisit: "2023-12-12",
            },
          },
        ],
        typeOfLivestock: "beef",
        organisation: {
          name: "Farmer Johns",
          sbi: "12345",
        },
        reviewTestResults: "positive",
        reference: "TEMP-6GSE-PIR8",
        latestEndemicsApplication,
        dateOfVisit: "2025-01-01",
      });
    const options = {
      method: "POST",
      url,
      payload: {
        crumb,
        "visit-date-day": "01",
        "visit-date-month": "01",
        "visit-date-year": "2025",
      },
      auth,
      headers: { cookie: `crumb=${crumb}` },
    };

    const res = await server.inject(options);

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/date-of-testing");
    expect(setSessionData).toHaveBeenCalledWith(
      expect.any(Object),
      "endemicsClaim",
      "dateOfVisit",
      new Date(2025, 0, 1),
    );
    expect(trackEvent).not.toHaveBeenCalled();
  });

  test("user makes a review claim and has a previous review claim for a different species, no others for same species and is after MS was enabled", async () => {
    // happy path
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
      .mockReturnValue({
        typeOfReview: "REVIEW",
        previousClaims: [
          {
            reference: "REBC-C2EA-C718",
            applicationReference: "AHWR-2470-6BA9",
            status: "AGREED",
            type: "REVIEW",
            createdAt: "2024-12-12T10:25:11.318Z",
            data: {
              typeOfLivestock: "dairy",
              dateOfVisit: "2024-12-12",
            },
          },
        ],
        typeOfLivestock: "beef",
        organisation: {
          name: "Farmer Johns",
          sbi: "12345",
        },
        reviewTestResults: "positive",
        reference: "TEMP-6GSE-PIR8",
        latestEndemicsApplication,
        dateOfVisit: "2025-02-26",
      });
    const options = {
      method: "POST",
      url,
      payload: {
        crumb,
        "visit-date-day": "26",
        "visit-date-month": "02",
        "visit-date-year": "2025",
      },
      auth,
      headers: { cookie: `crumb=${crumb}` },
    };

    const res = await server.inject(options);

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/date-of-testing");
    expect(setSessionData).toHaveBeenCalledWith(
      expect.any(Object),
      "endemicsClaim",
      "dateOfVisit",
      new Date(2025, 1, 26),
    );
    // expect(appInsights.defaultClient.trackEvent).not.toHaveBeenCalled()
  });

  test(`user makes a review claim and has a previous review claim for a different species, 
    no others for same species and is before MS was enabled`, async () => {
    // unhappy path
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
      .mockReturnValue({
        typeOfReview: "REVIEW",
        previousClaims: [
          {
            reference: "REBC-C2EA-C718",
            applicationReference: "AHWR-2470-6BA9",
            status: "AGREED",
            type: "REVIEW",
            createdAt: "2024-12-12T10:25:11.318Z",
            data: {
              typeOfLivestock: "dairy",
              dateOfVisit: "2024-12-12",
            },
          },
        ],
        typeOfLivestock: "beef",
        organisation: {
          name: "Farmer Johns",
          sbi: "12345",
        },
        reviewTestResults: "positive",
        reference: "TEMP-6GSE-PIR8",
        latestEndemicsApplication,
        dateOfVisit: "2025-01-01",
      });
    const options = {
      method: "POST",
      url,
      payload: {
        crumb,
        "visit-date-day": "01",
        "visit-date-month": "01",
        "visit-date-year": "2025",
      },
      auth,
      headers: { cookie: `crumb=${crumb}` },
    };

    const res = await server.inject(options);
    const $ = cheerio.load(res.payload);

    expect(res.statusCode).toBe(400);
    expect($("h1").text().trim()).toMatch("You cannot continue with your claim");
    expect(sendInvalidDataEvent).toHaveBeenCalled();

    expect(setSessionData).toHaveBeenCalledWith(
      expect.any(Object),
      "endemicsClaim",
      "dateOfVisit",
      new Date(2025, 0, 1),
    );

    expect(trackEvent).toHaveBeenCalledWith(
      expect.any(Object),
      "claim-invalid-date-of-visit",
      "review",
      {
        reason:
          "User is attempting to claim for MS with a date of visit of Wed Jan 01 2025 00:00:00 GMT+0000 (Greenwich Mean Time) which is before MS was enabled.",
        reference: "TEMP-6GSE-PIR8",
      },
    );
  });

  test("user has an old world claim, and makes a new world claim over 10 months later for the same species", async () => {
    // happy path
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
      .mockReturnValue({
        typeOfReview: "REVIEW",
        previousClaims: [],
        typeOfLivestock: "beef",
        organisation: {
          name: "Farmer Johns",
          sbi: "12345",
        },
        reviewTestResults: "positive",
        reference: "TEMP-6GSE-PIR8",
        latestVetVisitApplication,
        latestEndemicsApplication,
        dateOfVisit: "2025-01-01",
      });
    const options = {
      method: "POST",
      url,
      payload: {
        crumb,
        "visit-date-day": "01",
        "visit-date-month": "01",
        "visit-date-year": "2025",
      },
      auth,
      headers: { cookie: `crumb=${crumb}` },
    };

    const res = await server.inject(options);

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/date-of-testing");
    expect(setSessionData).toHaveBeenCalledWith(
      expect.any(Object),
      "endemicsClaim",
      "dateOfVisit",
      new Date(2025, 0, 1),
    );
    expect(trackEvent).not.toHaveBeenCalled();
  });

  test("user has an old world claim, and makes a new world claim over 10 months later for a different species", async () => {
    // happy path
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
      .mockReturnValue({
        typeOfReview: "REVIEW",
        previousClaims: [],
        typeOfLivestock: "pigs",
        organisation: {
          name: "Farmer Johns",
          sbi: "12345",
        },
        reviewTestResults: "positive",
        reference: "TEMP-6GSE-PIR8",
        latestVetVisitApplication,
        latestEndemicsApplication,
        dateOfVisit: "2025-01-01",
      });
    const options = {
      method: "POST",
      url,
      payload: {
        crumb,
        "visit-date-day": "01",
        "visit-date-month": "01",
        "visit-date-year": "2025",
      },
      auth,
      headers: { cookie: `crumb=${crumb}` },
    };

    const res = await server.inject(options);

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/date-of-testing");
    expect(setSessionData).toHaveBeenCalledWith(
      expect.any(Object),
      "endemicsClaim",
      "dateOfVisit",
      new Date(2025, 0, 1),
    );
    expect(trackEvent).not.toHaveBeenCalled();
  });

  test("user has an old world claim, and makes a new world claim within 10 months for the same species", async () => {
    // unhappy path
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
      .mockReturnValue({
        typeOfReview: "REVIEW",
        previousClaims: [],
        typeOfLivestock: "beef",
        organisation: {
          name: "Farmer Johns",
          sbi: "12345",
        },
        reviewTestResults: "positive",
        reference: "TEMP-6GSE-PIR8",
        latestVetVisitApplication: {
          ...latestVetVisitApplication,
          data: {
            visitDate: "2024-12-01",
            whichReview: "beef",
          },
        },
        latestEndemicsApplication,
        dateOfVisit: "2025-01-02",
      });
    const options = {
      method: "POST",
      url,
      payload: {
        crumb,
        "visit-date-day": "02",
        "visit-date-month": "01",
        "visit-date-year": "2025",
      },
      auth,
      headers: { cookie: `crumb=${crumb}` },
    };

    const res = await server.inject(options);

    const $ = cheerio.load(res.payload);

    expect(res.statusCode).toBe(400);
    expect($("h1").text().trim()).toMatch("You cannot continue with your claim");
    expect(sendInvalidDataEvent).toHaveBeenCalled();

    expect(setSessionData).toHaveBeenCalledWith(
      expect.any(Object),
      "endemicsClaim",
      "dateOfVisit",
      new Date(2025, 0, 2),
    );
    expect(trackEvent).toHaveBeenCalledWith(
      expect.any(Object),
      "claim-invalid-date-of-visit",
      "review",
      {
        kind: "Thu Jan 02 2025 00:00:00 GMT+0000 (Greenwich Mean Time) is invalid",
        reason: "There must be at least 10 months between your reviews.",
        reference: "TEMP-6GSE-PIR8",
      },
    );
  });

  test("user has an old world claim, and makes a new world claim within 10 months for a different species", async () => {
    // happy path
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
      .mockReturnValue({
        typeOfReview: "REVIEW",
        previousClaims: [],
        typeOfLivestock: "beef",
        organisation: {
          name: "Farmer Johns",
          sbi: "12345",
        },
        reviewTestResults: "positive",
        reference: "TEMP-6GSE-PIR8",
        latestVetVisitApplication: {
          ...latestVetVisitApplication,
          data: {
            visitDate: "2024-12-01",
            whichReview: "pigs",
          },
        },
        latestEndemicsApplication,
        dateOfVisit: "2025-01-02",
      });
    const options = {
      method: "POST",
      url,
      payload: {
        crumb,
        "visit-date-day": "02",
        "visit-date-month": "01",
        "visit-date-year": "2025",
      },
      auth,
      headers: { cookie: `crumb=${crumb}` },
    };

    const res = await server.inject(options);

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/date-of-testing");
    expect(setSessionData).toHaveBeenCalledWith(
      expect.any(Object),
      "endemicsClaim",
      "dateOfVisit",
      new Date(2025, 0, 2),
    );
    expect(trackEvent).not.toHaveBeenCalled();
  });

  test("user makes an endemics claim within 10 months of the same species of their initial review claim", async () => {
    // happy path
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
      .mockReturnValue({
        typeOfReview: "FOLLOW_UP",
        previousClaims: [
          {
            reference: "AHWR-C2EA-C718",
            applicationReference: "AHWR-2470-6BA9",
            status: "READY_TO_PAY",
            type: "REVIEW",
            createdAt: "2024-09-01T10:25:11.318Z",
            data: {
              typeOfLivestock: "beef",
              dateOfVisit: "2024-09-01",
            },
          },
        ],
        typeOfLivestock: "beef",
        organisation: {
          name: "Farmer Johns",
          sbi: "12345",
        },
        reviewTestResults: "positive",
        reference: "TEMP-6GSE-PIR8",
        latestEndemicsApplication,
        dateOfVisit: "2025-01-01",
      });
    const options = {
      method: "POST",
      url,
      payload: {
        crumb,
        "visit-date-day": "01",
        "visit-date-month": "01",
        "visit-date-year": "2025",
      },
      auth,
      headers: { cookie: `crumb=${crumb}` },
    };

    const res = await server.inject(options);

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/date-of-testing");
    expect(setSessionData).toHaveBeenCalledWith(
      expect.any(Object),
      "endemicsClaim",
      "dateOfVisit",
      new Date(2025, 0, 1),
    );
    expect(trackEvent).not.toHaveBeenCalled();
  });

  test("user makes an endemics dairy claim after dairy follow up release", async () => {
    // happy path
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
      .mockReturnValue({
        typeOfReview: "FOLLOW_UP",
        previousClaims: [
          {
            reference: "AHWR-C2EA-C718",
            applicationReference: "AHWR-2470-6BA9",
            status: "READY_TO_PAY",
            type: "REVIEW",
            createdAt: "2024-09-01T10:25:11.318Z",
            data: {
              typeOfLivestock: "dairy",
              dateOfVisit: "2024-09-01",
            },
          },
        ],
        typeOfLivestock: "dairy",
        organisation: {
          name: "Farmer Johns",
          sbi: "12345",
        },
        reviewTestResults: "positive",
        reference: "TEMP-6GSE-PIR8",
        latestEndemicsApplication,
        dateOfVisit: "2025-01-21",
      });
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
    expect(res.headers.location).toBe("/species-numbers");
    expect(setSessionData).toHaveBeenCalledWith(
      expect.any(Object),
      "endemicsClaim",
      "dateOfVisit",
      new Date(2025, 0, 21),
    );
    expect(trackEvent).not.toHaveBeenCalled();
  });

  test("user makes an endemics dairy claim before dairy follow up release", async () => {
    // unhappy path
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
      .mockReturnValue({
        typeOfReview: "FOLLOW_UP",
        previousClaims: [
          {
            reference: "AHWR-C2EA-C718",
            applicationReference: "AHWR-2470-6BA9",
            status: "READY_TO_PAY",
            type: "REVIEW",
            createdAt: "2024-09-01T10:25:11.318Z",
            data: {
              typeOfLivestock: "dairy",
              dateOfVisit: "2024-09-01",
            },
          },
        ],
        typeOfLivestock: "dairy",
        organisation: {
          name: "Farmer Johns",
          sbi: "12345",
        },
        reviewTestResults: "positive",
        reference: "TEMP-6GSE-PIR8",
        latestEndemicsApplication,
        dateOfVisit: "2025-01-20",
      });
    const options = {
      method: "POST",
      url,
      payload: {
        crumb,
        "visit-date-day": "20",
        "visit-date-month": "01",
        "visit-date-year": "2025",
      },
      auth,
      headers: { cookie: `crumb=${crumb}` },
    };

    const res = await server.inject(options);
    const $ = cheerio.load(res.payload);

    expect(res.statusCode).toBe(400);
    expect($("h1").text().trim()).toMatch("You cannot continue with your claim");
    expect(sendInvalidDataEvent).toHaveBeenCalled();

    expect(setSessionData).toHaveBeenCalledWith(
      expect.any(Object),
      "endemicsClaim",
      "dateOfVisit",
      new Date(2025, 0, 20),
    );
    expect(trackEvent).toHaveBeenCalledWith(
      expect.any(Object),
      "claim-invalid-date-of-visit",
      "follow-up",
      {
        reason:
          "User is attempting to claim for dairy follow-up with a date of visit of Mon Jan 20 2025 00:00:00 GMT+0000 (Greenwich Mean Time) which is before dairy follow-ups was enabled.",
        reference: "TEMP-6GSE-PIR8",
      },
    );
  });

  test("user makes an endemics claim within 10 months of a previous endemics claim of the same species", async () => {
    // unhappy path
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
      .mockReturnValue({
        typeOfReview: "FOLLOW_UP",
        previousClaims: [
          {
            reference: "AHWR-C2EA-C718",
            applicationReference: "AHWR-2470-6BA9",
            status: "READY_TO_PAY",
            type: "REVIEW",
            createdAt: "2024-09-01T10:25:11.318Z",
            data: {
              typeOfLivestock: "beef",
              dateOfVisit: "2024-09-01",
            },
          },
          {
            reference: "AHWR-C2EA-C718",
            applicationReference: "AHWR-2470-6BA9",
            status: "READY_TO_PAY",
            type: "FOLLOW_UP",
            createdAt: "2024-10-01T10:25:11.318Z",
            data: {
              typeOfLivestock: "beef",
              dateOfVisit: "2024-10-01",
            },
          },
        ],
        typeOfLivestock: "beef",
        organisation: {
          name: "Farmer Johns",
          sbi: "12345",
        },
        reviewTestResults: "positive",
        reference: "TEMP-6GSE-PIR8",
        latestEndemicsApplication,
        dateOfVisit: "2025-01-01",
      });
    const options = {
      method: "POST",
      url,
      payload: {
        crumb,
        "visit-date-day": "01",
        "visit-date-month": "01",
        "visit-date-year": "2025",
      },
      auth,
      headers: { cookie: `crumb=${crumb}` },
    };

    const res = await server.inject(options);

    const $ = cheerio.load(res.payload);

    expect(res.statusCode).toBe(400);
    expect($("title").text()).toMatch(
      "You cannot continue with your claim - Get funding to improve animal health and welfare - GOV.UKGOV.UK",
    );
    const link = $('a.govuk-link[rel="external"]');
    expect(link.attr("href")).toBe(
      "https://www.gov.uk/guidance/farmers-how-to-apply-for-funding-to-improve-animal-health-and-welfare#timing-of-reviews-and-follow-ups",
    );
    expect(link.text()).toBe("There must be at least 10 months between your follow-ups.");
    expect(sendInvalidDataEvent).toHaveBeenCalled();
    expect(trackEvent).toHaveBeenCalledWith(
      expect.any(Object),
      "claim-invalid-date-of-visit",
      "follow-up",
      {
        kind: "Wed Jan 01 2025 00:00:00 GMT+0000 (Greenwich Mean Time) is invalid",
        reason: "There must be at least 10 months between your follow-ups.",
        reference: "TEMP-6GSE-PIR8",
      },
    );
  });

  test("user makes an endemics claim within 10 months of a previous endemics claim of a different species, assuming everything else otherwise ok", async () => {
    // happy path
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
      .mockReturnValue({
        typeOfReview: "FOLLOW_UP",
        previousClaims: [
          {
            reference: "AHWR-C2EA-C718",
            applicationReference: "AHWR-2470-6BA9",
            status: "READY_TO_PAY",
            type: "REVIEW",
            createdAt: "2024-09-01T10:25:11.318Z",
            data: {
              typeOfLivestock: "beef",
              dateOfVisit: "2024-09-01",
            },
          },
          {
            reference: "AHWR-C2EA-C718",
            applicationReference: "AHWR-2470-6BA9",
            status: "READY_TO_PAY",
            type: "FOLLOW_UP",
            createdAt: "2024-10-01T10:25:11.318Z",
            data: {
              typeOfLivestock: "beef",
              dateOfVisit: "2024-10-01",
            },
          },
          {
            reference: "AHWR-4E4T-5TR3",
            applicationReference: "AHWR-2470-6BA9",
            status: "READY_TO_PAY",
            type: "REVIEW",
            createdAt: "2024-09-01T10:25:11.318Z",
            data: {
              typeOfLivestock: "pigs",
              dateOfVisit: "2024-09-01",
            },
          },
        ],
        typeOfLivestock: "pigs",
        organisation: {
          name: "Farmer Johns",
          sbi: "12345",
        },
        reviewTestResults: "positive",
        reference: "TEMP-6GSE-PIR8",
        latestEndemicsApplication,
        dateOfVisit: "2025-02-27",
      });
    const options = {
      method: "POST",
      url,
      payload: {
        crumb,
        "visit-date-day": "27",
        "visit-date-month": "02",
        "visit-date-year": "2025",
      },
      auth,
      headers: { cookie: `crumb=${crumb}` },
    };

    const res = await server.inject(options);

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/date-of-testing");
    expect(setSessionData).toHaveBeenCalledWith(
      expect.any(Object),
      "endemicsClaim",
      "dateOfVisit",
      new Date(2025, 1, 27),
    );
    expect(trackEvent).not.toHaveBeenCalled();
  });

  test("user makes an endemics claim and the review in question is rejected", async () => {
    // unhappy path
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
      .mockReturnValue({
        typeOfReview: "FOLLOW_UP",
        previousClaims: [
          {
            reference: "AHWR-C2EA-C718",
            applicationReference: "AHWR-2470-6BA9",
            status: "REJECTED",
            type: "REVIEW",
            createdAt: "2024-09-01T10:25:11.318Z",
            data: {
              typeOfLivestock: "beef",
              dateOfVisit: "2024-09-01",
            },
          },
        ],
        typeOfLivestock: "beef",
        reviewTestResults: "positive",
        reference: "TEMP-6GSE-PIR8",
        latestEndemicsApplication,
        dateOfVisit: "2025-01-01",
      });
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.organisation)
      .mockReturnValue({
        name: "Farmer Johns",
        sbi: "12345",
      });
    const options = {
      method: "POST",
      url,
      payload: {
        crumb,
        "visit-date-day": "01",
        "visit-date-month": "01",
        "visit-date-year": "2025",
      },
      auth,
      headers: { cookie: `crumb=${crumb}` },
    };

    const res = await server.inject(options);

    const $ = cheerio.load(res.payload);

    expect(res.statusCode).toBe(400);
    expect($("title").text()).toMatch(
      "You cannot continue with your claim - Get funding to improve animal health and welfare - GOV.UKGOV.UK",
    );
    const mainMessage = $("h1.govuk-heading-l").first().nextAll("p").first();
    expect(mainMessage.text().trim()).toBe(
      "Farmer Johns - SBI 12345 had a failed review claim for beef cattle in the last 10 months.",
    );
    expect(sendInvalidDataEvent).toHaveBeenCalled();
    expect(trackEvent).toHaveBeenCalledWith(
      expect.any(Object),
      "claim-invalid-date-of-visit",
      "follow-up",
      {
        kind: "Wed Jan 01 2025 00:00:00 GMT+0000 (Greenwich Mean Time) is invalid",
        reason:
          "Farmer Johns - SBI 12345 had a failed review claim for beef cattle in the last 10 months.",
        reference: "TEMP-6GSE-PIR8",
      },
    );
  });

  test("user makes an endemics claim and the review is not in READY_TO_PAY or PAID status", async () => {
    // unhappy path
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
      .mockReturnValue({
        typeOfReview: "FOLLOW_UP",
        previousClaims: [
          {
            reference: "AHWR-C2EA-C718",
            applicationReference: "AHWR-2470-6BA9",
            status: "AGREED",
            type: "REVIEW",
            createdAt: "2024-09-01T10:25:11.318Z",
            data: {
              typeOfLivestock: "beef",
              dateOfVisit: "2024-09-01",
            },
          },
        ],
        typeOfLivestock: "beef",
        organisation: {
          name: "Farmer Johns",
          sbi: "12345",
        },
        reviewTestResults: "positive",
        reference: "TEMP-6GSE-PIR8",
        latestEndemicsApplication,
        dateOfVisit: "2025-01-01",
      });
    const options = {
      method: "POST",
      url,
      payload: {
        crumb,
        "visit-date-day": "01",
        "visit-date-month": "01",
        "visit-date-year": "2025",
      },
      auth,
      headers: { cookie: `crumb=${crumb}` },
    };

    const res = await server.inject(options);

    const $ = cheerio.load(res.payload);

    expect(res.statusCode).toBe(400);
    expect($("title").text()).toMatch(
      "You cannot continue with your claim - Get funding to improve animal health and welfare - GOV.UKGOV.UK",
    );
    const link = $('a.govuk-link[rel="external"]');
    expect(link.attr("href")).toBe(
      "https://www.gov.uk/guidance/farmers-how-to-apply-for-funding-to-improve-animal-health-and-welfare#timing-of-reviews-and-follow-ups",
    );
    expect(link.text()).toBe(
      "Your review claim must have been approved before you claim for the follow-up that happened after it.",
    );
    expect(trackEvent).toHaveBeenCalledWith(
      expect.any(Object),
      "claim-invalid-date-of-visit",
      "follow-up",
      {
        kind: "Wed Jan 01 2025 00:00:00 GMT+0000 (Greenwich Mean Time) is invalid",
        reason:
          "Your review claim must have been approved before you claim for the follow-up that happened after it.",
        reference: "TEMP-6GSE-PIR8",
      },
    );
  });

  test("user has an old world claim, and makes a new world endemics claim", async () => {
    // happy path
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
      .mockReturnValue({
        typeOfReview: "FOLLOW_UP",
        previousClaims: [],
        typeOfLivestock: "beef",
        organisation: {
          name: "Farmer Johns",
          sbi: "12345",
        },
        reviewTestResults: "positive",
        reference: "TEMP-6GSE-PIR8",
        latestVetVisitApplication: {
          ...latestVetVisitApplication,
          data: {
            visitDate: "2024-12-01",
            whichReview: "beef",
          },
          status: "READY_TO_PAY",
        },
        latestEndemicsApplication,
        dateOfVisit: "2025-01-01",
      });
    const options = {
      method: "POST",
      url,
      payload: {
        crumb,
        "visit-date-day": "01",
        "visit-date-month": "01",
        "visit-date-year": "2025",
      },
      auth,
      headers: { cookie: `crumb=${crumb}` },
    };

    const res = await server.inject(options);
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/date-of-testing");
    expect(setSessionData).toHaveBeenCalledWith(
      expect.any(Object),
      "endemicsClaim",
      "dateOfVisit",
      new Date(2025, 0, 1),
    );
    expect(trackEvent).not.toHaveBeenCalled();
  });

  test("for an endemics claim, it redirects to endemics date of testing page when claim is for beef or dairy, and the previous review test results are positive", async () => {
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
      .mockReturnValue({
        typeOfReview: "FOLLOW_UP",
        previousClaims: [
          {
            reference: "AHWR-C2EA-C718",
            applicationReference: "AHWR-2470-6BA9",
            status: "READY_TO_PAY",
            type: "REVIEW",
            createdAt: "2024-09-01T10:25:11.318Z",
            data: {
              typeOfLivestock: "beef",
              dateOfVisit: "2024-09-01",
            },
          },
        ],
        typeOfLivestock: "beef",
        organisation: {
          name: "Farmer Johns",
          sbi: "12345",
        },
        reviewTestResults: "positive",
        reference: "TEMP-6GSE-PIR8",
        latestEndemicsApplication,
        dateOfVisit: "2025-01-01",
      });
    const options = {
      method: "POST",
      url,
      payload: {
        crumb,
        "visit-date-day": "01",
        "visit-date-month": "01",
        "visit-date-year": "2025",
      },
      auth,
      headers: { cookie: `crumb=${crumb}` },
    };

    const res = await server.inject(options);

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toEqual("/date-of-testing");
    expect(setSessionData).toHaveBeenCalledWith(
      expect.any(Object),
      "endemicsClaim",
      "reviewTestResults",
      "positive",
    );
    expect(trackEvent).not.toHaveBeenCalled();
  });

  test("should redirect to endemics date of testing page when endemics claim is for beef or dairy, the previous review test results has not been set and there are multiple previous reviews of different species with different test results", async () => {
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
      .mockReturnValue({
        typeOfReview: "FOLLOW_UP",
        previousClaims: [
          {
            reference: "AHWR-C2EA-C718",
            applicationReference: "AHWR-2470-6BA9",
            status: "READY_TO_PAY",
            type: "REVIEW",
            createdAt: "2024-09-01T10:25:11.318Z",
            data: {
              typeOfLivestock: "sheep",
              dateOfVisit: "2024-09-01",
              testResults: "negative",
            },
          },
          {
            reference: "AHWR-C2EA-C718",
            applicationReference: "AHWR-2470-6BA9",
            status: "READY_TO_PAY",
            type: "REVIEW",
            createdAt: "2024-09-01T10:25:11.318Z",
            data: {
              typeOfLivestock: "beef",
              dateOfVisit: "2024-09-01",
              testResults: "positive",
            },
          },
        ],
        typeOfLivestock: "beef",
        organisation: {
          name: "Farmer Johns",
          sbi: "12345",
        },
        reference: "TEMP-6GSE-PIR8",
        latestEndemicsApplication,
        dateOfVisit: "2024-10-01",
      });
    const options = {
      method: "POST",
      url,
      payload: {
        crumb,
        "visit-date-day": "27",
        "visit-date-month": "02",
        "visit-date-year": "2025",
      },
      auth,
      headers: { cookie: `crumb=${crumb}` },
    };

    const res = await server.inject(options);

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toEqual("/date-of-testing");
    expect(setSessionData).toHaveBeenCalledWith(
      expect.any(Object),
      "endemicsClaim",
      "relevantReviewForEndemics",
      {
        reference: "AHWR-C2EA-C718",
        applicationReference: "AHWR-2470-6BA9",
        status: "READY_TO_PAY",
        type: "REVIEW",
        createdAt: "2024-09-01T10:25:11.318Z",
        data: {
          typeOfLivestock: "beef",
          dateOfVisit: "2024-09-01",
          testResults: "positive",
        },
      },
    );
    expect(setSessionData).toHaveBeenCalledWith(
      expect.any(Object),
      "endemicsClaim",
      "dateOfVisit",
      new Date("2025/02/27"),
    );
    expect(setSessionData).toHaveBeenCalledWith(
      expect.any(Object),
      "endemicsClaim",
      "reviewTestResults",
      "positive",
    );
    expect(trackEvent).not.toHaveBeenCalled();
  });

  test("for an endemics claim, it redirects to endemics species numbers page when claim is for beef or dairy, and the previous review test results are negative", async () => {
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
      .mockReturnValue({
        typeOfReview: "FOLLOW_UP",
        previousClaims: [
          {
            reference: "AHWR-C2EA-C718",
            applicationReference: "AHWR-2470-6BA9",
            status: "READY_TO_PAY",
            type: "REVIEW",
            createdAt: "2024-09-01T10:25:11.318Z",
            data: {
              typeOfLivestock: "beef",
              dateOfVisit: "2024-09-01",
            },
          },
        ],
        typeOfLivestock: "beef",
        organisation: {
          name: "Farmer Johns",
          sbi: "12345",
        },
        reviewTestResults: "negative",
        reference: "TEMP-6GSE-PIR8",
        latestEndemicsApplication,
        dateOfVisit: "2025-01-01",
      });
    const options = {
      method: "POST",
      url,
      payload: {
        crumb,
        "visit-date-day": "01",
        "visit-date-month": "01",
        "visit-date-year": "2025",
      },
      auth,
      headers: { cookie: `crumb=${crumb}` },
    };

    const res = await server.inject(options);

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toEqual("/species-numbers");
    expect(trackEvent).not.toHaveBeenCalled();
  });

  test(`for an endemics claim, it redirects to endemics species numbers page when claim 
        is for beef or dairy, and the previous review test results are positive 
        BUT visit date post go live`, async () => {
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
      .mockReturnValue({
        typeOfReview: "FOLLOW_UP",
        previousClaims: [
          {
            reference: "AHWR-C2EA-C718",
            applicationReference: "AHWR-2470-6BA9",
            status: "READY_TO_PAY",
            type: "REVIEW",
            createdAt: "2024-09-01T10:25:11.318Z",
            data: {
              typeOfLivestock: "beef",
              dateOfVisit: "2024-09-01",
            },
          },
        ],
        typeOfLivestock: "beef",
        organisation: {
          name: "Farmer Johns",
          sbi: "12345",
        },
        reviewTestResults: "positive",
        reference: "TEMP-6GSE-PIR8",
        latestEndemicsApplication,
        dateOfVisit: "2025-01-21",
      });
    const options = {
      method: "POST",
      url,
      payload: {
        crumb,
        /* see PI_HUNT_AND_DAIRY_FOLLOW_UP_RELEASE_DATE */
        "visit-date-day": "21",
        "visit-date-month": "01",
        "visit-date-year": "2025",
      },
      auth,
      headers: { cookie: `crumb=${crumb}` },
    };

    const res = await server.inject(options);

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toEqual("/species-numbers");
    expect(trackEvent).not.toHaveBeenCalled();
  });

  test(`for an endemics claim, it redirects to endemics date of testing page when claim 
    is for beef or dairy, and the previous review test results are positive 
    AND optional PI hunt is enabled BUT visit date pre go-live`, async () => {
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
      .mockReturnValue({
        typeOfReview: "FOLLOW_UP",
        previousClaims: [
          {
            reference: "AHWR-C2EA-C718",
            applicationReference: "AHWR-2470-6BA9",
            status: "READY_TO_PAY",
            type: "REVIEW",
            createdAt: "2024-09-01T10:25:11.318Z",
            data: {
              typeOfLivestock: "beef",
              dateOfVisit: "2024-09-01",
            },
          },
        ],
        typeOfLivestock: "beef",
        organisation: {
          name: "Farmer Johns",
          sbi: "12345",
        },
        reviewTestResults: "positive",
        reference: "TEMP-6GSE-PIR8",
        latestEndemicsApplication,
        dateOfVisit: "2025-01-20",
      });
    const options = {
      method: "POST",
      url,
      payload: {
        crumb,
        /* see PI_HUNT_AND_DAIRY_FOLLOW_UP_RELEASE_DATE */
        "visit-date-day": "20",
        "visit-date-month": "01",
        "visit-date-year": "2025",
      },
      auth,
      headers: { cookie: `crumb=${crumb}` },
    };

    const res = await server.inject(options);

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toEqual("/date-of-testing");
    expect(trackEvent).not.toHaveBeenCalled();
  });

  test("should redirect to select the herd page when there are previous herds and is multi herds journey", async () => {
    getHerds.mockResolvedValueOnce({ herds: [{ id: "1", herdName: "herd one" }] });
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
      .mockReturnValue({
        typeOfReview: "FOLLOW_UP",
        previousClaims: [
          {
            reference: "AHWR-C2EA-C718",
            applicationReference: "AHWR-2470-6BA9",
            status: "READY_TO_PAY",
            type: "REVIEW",
            createdAt: "2024-09-01T10:25:11.318Z",
            data: {
              typeOfLivestock: "beef",
              dateOfVisit: "2024-09-01",
            },
          },
        ],
        typeOfLivestock: "beef",
        organisation: {
          name: "Farmer Johns",
          sbi: "12345",
        },
        reviewTestResults: "positive",
        reference: "TEMP-6GSE-PIR8",
        latestEndemicsApplication,
        dateOfVisit: "2025-05-13",
      });
    const options = {
      method: "POST",
      url,
      payload: {
        crumb,
        "visit-date-day": "13",
        "visit-date-month": "05",
        "visit-date-year": "2025",
      },
      auth,
      headers: { cookie: `crumb=${crumb}` },
    };

    const res = await server.inject(options);

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toEqual("/select-the-herd");
  });

  test("should redirect to enter herd name page when there are not previous herds and is multi herds journey", async () => {
    getHerds.mockResolvedValueOnce({ herds: [] });
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
      .mockReturnValue({
        typeOfReview: "FOLLOW_UP",
        previousClaims: [
          {
            reference: "AHWR-C2EA-C718",
            applicationReference: "AHWR-2470-6BA9",
            status: "READY_TO_PAY",
            type: "REVIEW",
            createdAt: "2024-09-01T10:25:11.318Z",
            data: {
              typeOfLivestock: "beef",
              dateOfVisit: "2024-09-01",
            },
          },
        ],
        typeOfLivestock: "beef",
        organisation: {
          name: "Farmer Johns",
          sbi: "12345",
        },
        reviewTestResults: "positive",
        reference: "TEMP-6GSE-PIR8",
        latestEndemicsApplication,
        dateOfVisit: "2025-05-13",
      });
    const options = {
      method: "POST",
      url,
      payload: {
        crumb,
        "visit-date-day": "13",
        "visit-date-month": "05",
        "visit-date-year": "2025",
      },
      auth,
      headers: { cookie: `crumb=${crumb}` },
    };

    const res = await server.inject(options);

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toEqual("/enter-herd-name");
  });

  test("should redirect to species-numbers page when making a follow-up claim with visit date of pre-MH go-live, against a pre-MH review, and already made post-MH review for another herd", async () => {
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
      .mockReturnValue({
        typeOfReview: "FOLLOW_UP",
        previousClaims: [
          {
            reference: "REBC-CBLH-B9BB",
            applicationReference: "IAHW-T1EX-1R33",
            status: "READY_TO_PAY",
            type: "REVIEW",
            createdAt: "2025-05-01T10:25:11.318Z",
            data: {
              typeOfLivestock: "dairy",
              dateOfVisit: "2025-05-01",
            },
            herd: {
              id: "fake-herd-id",
            },
          },
          {
            reference: "REBC-CBLH-A9AA",
            applicationReference: "IAHW-T1EX-1R33",
            status: "READY_TO_PAY",
            type: "REVIEW",
            createdAt: "2024-09-01T10:25:11.318Z",
            data: {
              typeOfLivestock: "dairy",
              dateOfVisit: "2024-09-01",
            },
          },
        ],
        typeOfLivestock: "dairy",
        organisation: {
          name: "Farmer Johns",
          sbi: "12345",
        },
        reviewTestResults: "positive",
        reference: "TEMP-CBLH-C9CC",
        latestEndemicsApplication,
        dateOfVisit: "2025-04-30",
      });
    const options = {
      method: "POST",
      url,
      payload: {
        crumb,
        "visit-date-day": "30",
        "visit-date-month": "04",
        "visit-date-year": "2025",
      },
      auth,
      headers: { cookie: `crumb=${crumb}` },
    };

    const res = await server.inject(options);

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/species-numbers");
    expect(setSessionData).toHaveBeenCalledWith(
      expect.any(Object),
      "endemicsClaim",
      "dateOfVisit",
      new Date(2025, 3, 30),
    );
    expect(trackEvent).not.toHaveBeenCalled();
  });

  test("should error when trying to follow-up against post-MH review and visit date is pre-MH go-live", async () => {
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
      .mockReturnValue({
        typeOfReview: "FOLLOW_UP",
        previousClaims: [
          {
            reference: "REBC-CBLH-B9BB",
            applicationReference: "IAHW-T1EX-1R33",
            status: "READY_TO_PAY",
            type: "REVIEW",
            createdAt: "2025-05-01T10:25:11.318Z",
            data: {
              typeOfLivestock: "dairy",
              dateOfVisit: "2025-05-01",
            },
            herd: {
              id: "fake-herd-id",
            },
          },
        ],
        typeOfLivestock: "dairy",
        organisation: {
          name: "Farmer Johns",
          sbi: "12345",
        },
        reviewTestResults: "positive",
        reference: "TEMP-CBLH-C9CC",
        latestEndemicsApplication,
        dateOfVisit: "2025-04-30",
      });
    const options = {
      method: "POST",
      url,
      payload: {
        crumb,
        "visit-date-day": "30",
        "visit-date-month": "04",
        "visit-date-year": "2025",
      },
      auth,
      headers: { cookie: `crumb=${crumb}` },
    };

    const res = await server.inject(options);

    const $ = cheerio.load(res.payload);
    expect(res.statusCode).toBe(400);
    expect($(".govuk-heading-l").text().trim()).toEqual("You cannot continue with your claim");
    expect(
      $(".govuk-link").filter(function () {
        return $(this).text().trim() === "Tell us if you are claiming for a review or follow up.";
      }).length,
    ).toBe(1);
    expect(trackEvent).toHaveBeenCalledWith(
      expect.any(Object),
      "claim-invalid-date-of-visit",
      "follow-up",
      {
        reason: "Cannot claim for endemics without a previous review.",
        reference: "TEMP-CBLH-C9CC",
      },
    );
  });
});

describe("previousPageUrl", () => {
  test("should return url of endemicsVetVisitsReviewTestResults if endemics, old world claim is species of current user journey, and no relevant new world claims", () => {
    const latestVetVisitApplication = {
      data: {
        whichReview: "beef",
      },
    };

    const typeOfReview = "FOLLOW_UP";
    const previousClaims = [];
    const typeOfLivestock = "beef";

    expect(
      previousPageUrl(latestVetVisitApplication, typeOfReview, previousClaims, typeOfLivestock),
    ).toBe("/vet-visits-review-test-results");
  });

  test("should return url of endemicsWhichTypeOfReview if claim type is review", () => {
    const latestVetVisitApplication = {
      data: {
        whichReview: "beef",
      },
    };

    const typeOfReview = "REVIEW";
    const previousClaims = [];
    const typeOfLivestock = "beef";

    expect(
      previousPageUrl(latestVetVisitApplication, typeOfReview, previousClaims, typeOfLivestock),
    ).toBe("/which-type-of-review");
  });

  test("should return url of endemicsWhichTypeOfReview if old world review type of livestock is not beef or dairy", () => {
    const latestVetVisitApplication = {
      data: {
        whichReview: "pigs",
      },
    };

    const typeOfReview = "FOLLOW_UP";
    const previousClaims = [];
    const typeOfLivestock = "beef";

    expect(
      previousPageUrl(latestVetVisitApplication, typeOfReview, previousClaims, typeOfLivestock),
    ).toBe("/which-type-of-review");
  });

  test("should return url of endemicsWhichTypeOfReview if there are relevant new world claims (i.e. for the same species as the current journey)", () => {
    const latestVetVisitApplication = {
      data: {
        whichReview: "beef",
      },
    };

    const typeOfReview = "FOLLOW_UP";
    const previousClaims = [
      {
        reference: "REBC-C2EA-C718",
        applicationReference: "AHWR-2470-6BA9",
        status: "AGREED",
        type: "REVIEW",
        createdAt: "2024-12-12T10:25:11.318Z",
        data: {
          typeOfLivestock: "beef",
          dateOfVisit: "2024-12-12",
        },
      },
    ];
    const typeOfLivestock = "beef";

    expect(
      previousPageUrl(latestVetVisitApplication, typeOfReview, previousClaims, typeOfLivestock),
    ).toBe("/which-type-of-review");
  });
});

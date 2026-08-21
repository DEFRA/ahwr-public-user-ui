import * as cheerio from "cheerio";
import { createServer } from "../../../../../../app/server.js";
import expectPhaseBanner from "assert";
import { getCrumbs } from "../../../../../utils/get-crumbs.js";
import { getHerds } from "../../../../../../app/api-requests/application-api.js";
import {
  getSessionData,
  sessionEntryKeys,
  sessionKeys,
  setSessionData,
} from "../../../../../../app/session/index.js";
import { previousPageUrl } from "../../../../../../app/routes/livestock/claim/date-of-visit.js";
import { when } from "jest-when";
import { sendInvalidDataEvent } from "../../../../../../app/messaging/ineligibility-event-emission.js";
import { trackEvent } from "../../../../../../app/logging/logger.js";
import { axe } from "../../../../../helpers/axe-helper.js";
import {
  testBrowserPageTitle,
  testPageHeading,
} from "../../../../../helpers/page-title-and-heading.js";
import { testRedirectsToSignInWhenLoggedOut } from "../../../../../helpers/sign-in-redirect.js";
import { livestockClaimRoutes } from "../../../../../../app/constants/routes.js";

jest.mock("../../../../../../app/session");
jest.mock("../../../../../../app/messaging/ineligibility-event-emission.js");
jest.mock("../../../../../../app/api-requests/application-api.js");
jest.mock("../../../../../../app/logging/logger.js", () => ({
  ...jest.requireActual("../../../../../../app/logging/logger.js"),
  trackEvent: jest.fn(),
}));

function expectPageContentOk($, previousPageUrl) {
  expect($("title").text()).toMatch(
    /Date of livestock review|follow-up - Get funding to improve animal health and welfare/i,
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

const organisation = {
  name: "Farmer Johns",
  sbi: "12345",
};

const auth = { credentials: {}, strategy: "cookie" };
const url = livestockClaimRoutes.dateOfVisit;

const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);

describe("GET /livestock/date-of-visit handler", () => {
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

    when(getSessionData)
      .calledWith(
        expect.anything(),
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.latestEndemicsApplication,
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

  const mockEndemicsClaimSession = (overrides) =>
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
      .mockReturnValue({
        latestEndemicsApplication,
        latestVetVisitApplication,
        typeOfLivestock: "beef",
        reference: "TEMP-6GSE-PIR8",
        ...overrides,
      });

  const getResponse = (typeOfReview) => () => {
    mockEndemicsClaimSession({ typeOfReview, previousClaims: [] });
    return server.inject({ method: "GET", url, auth });
  };

  const options = {
    method: "GET",
    url,
    auth,
  };

  testBrowserPageTitle({
    title: "Date of livestock review",
    getResponse: getResponse("REVIEW"),
  });
  testBrowserPageTitle({
    title: "Date of livestock follow-up",
    getResponse: getResponse("FOLLOW_UP"),
  });
  testPageHeading({ heading: "Date of review", getResponse: getResponse("REVIEW") });
  testPageHeading({ heading: "Date of follow-up", getResponse: getResponse("FOLLOW_UP") });

  test("returns 200 when you dont have any previous claims", async () => {
    mockEndemicsClaimSession({ typeOfReview: "endemics", previousClaims: [] });

    const res = await server.inject(options);

    expect(await axe(res.payload)).toHaveNoViolations();
    expect(res.statusCode).toBe(200);
    const $ = cheerio.load(res.payload);
    expectPageContentOk($, livestockClaimRoutes.whichTypeOfReview);
    expectPhaseBanner.ok($);
  });

  test("returns 200 when you do have previous claims", async () => {
    mockEndemicsClaimSession({
      typeOfReview: "endemics",
      previousClaims: [
        {
          data: {
            typeOfReview: "REVIEW",
          },
        },
      ],
    });

    const res = await server.inject(options);

    expect(await axe(res.payload)).toHaveNoViolations();
    expect(res.statusCode).toBe(200);
    const $ = cheerio.load(res.payload);
    expectPageContentOk($, livestockClaimRoutes.whichTypeOfReview);
    expectPhaseBanner.ok($);
  });

  test("returns 200 and fills input with value in session", async () => {
    mockEndemicsClaimSession({
      typeOfReview: "endemics",
      previousClaims: [
        {
          data: {
            typeOfReview: "REVIEW",
          },
        },
      ],
      dateOfVisit: "2024-05-01",
    });

    const res = await server.inject(options);

    expect(await axe(res.payload)).toHaveNoViolations();
    expect(res.statusCode).toBe(200);
    const $ = cheerio.load(res.payload);
    expect($("#visit-date-day")[0].attribs.value).toEqual("1");
    expect($("#visit-date-month")[0].attribs.value).toEqual("5");
    expect($("#visit-date-year")[0].attribs.value).toEqual("2024");
    expectPageContentOk($, livestockClaimRoutes.whichTypeOfReview);
    expectPhaseBanner.ok($);
  });

  test("shows the follow-up heading and links back to the old world review test results for an endemics cattle claim with no relevant new world claims", async () => {
    mockEndemicsClaimSession({ typeOfReview: "FOLLOW_UP", previousClaims: [] });

    const res = await server.inject(options);

    expect(await axe(res.payload)).toHaveNoViolations();
    expect(res.statusCode).toBe(200);
    const $ = cheerio.load(res.payload);
    expect($(".govuk-back-link").attr("href")).toBe(
      livestockClaimRoutes.vetVisitsReviewTestResults,
    );
    expectPhaseBanner.ok($);
  });

  test("shows the review heading and links back to which-type-of-review for a review claim", async () => {
    mockEndemicsClaimSession({ typeOfReview: "REVIEW", previousClaims: [] });

    const res = await server.inject(options);

    expect(await axe(res.payload)).toHaveNoViolations();
    expect(res.statusCode).toBe(200);
    const $ = cheerio.load(res.payload);
    expect($(".govuk-back-link").attr("href")).toBe(livestockClaimRoutes.whichTypeOfReview);
    expectPhaseBanner.ok($);
  });

  testRedirectsToSignInWhenLoggedOut({
    getResponse: () => server.inject({ method: "GET", url }),
  });
});

describe("POST /livestock/date-of-visit handler", () => {
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

  testRedirectsToSignInWhenLoggedOut({
    getResponse: () => server.inject({ method: "POST", url }),
  });

  test("returns 403 when CSRF crumb is missing", async () => {
    const res = await server.inject({
      method: "POST",
      url,
      payload: { "visit-date-day": "15", "visit-date-month": "03", "visit-date-year": "2024" },
      auth,
    });
    expect(res.statusCode).toBe(403);
  });

  const postOptions = ({ day, month, year }) => ({
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
  });

  describe("date checks", () => {
    test.each([
      {
        scenario: "the entered date is of an incorrect format",
        day: "second",
        month: "february",
        year: "2000",
        error: "The date of review must be a real date",
        kind: "dateEntered: 2000-february-second, dateOfAgreement: 2025-01-01",
      },
      {
        scenario: "the day cannot exist for the month entered",
        day: "31",
        month: "02",
        year: "2023",
        error: "The date of review must be a real date",
        kind: "dateEntered: 2023-02-31, dateOfAgreement: 2025-01-01",
      },
      {
        scenario: "the date is before the agreement date",
        day: "31",
        month: "12",
        year: "2021",
        error: "The date of review must be the same as or after the date of your agreement",
        kind: "dateEntered: 2021-12-31, dateOfAgreement: 2025-01-01",
      },
      {
        scenario: "the date is in the future",
        day: `${tomorrow.getDate()}`,
        month: `${tomorrow.getMonth() + 1}`,
        year: `${tomorrow.getFullYear()}`,
        error: "The date of review must be today or in the past",
        kind: `dateEntered: ${tomorrow.getFullYear()}-${tomorrow.getMonth() + 1}-${tomorrow.getDate()}, dateOfAgreement: 2025-01-01`,
      },
      {
        scenario: "the date is incomplete",
        day: "15",
        month: "03",
        year: "",
        error: "Date of review must include a year",
        kind: "dateEntered: -03-15, dateOfAgreement: 2025-01-01",
      },
      {
        scenario: "the year is out of range",
        day: "15",
        month: "03",
        year: "10000",
        error: "Year must include 4 numbers",
        kind: "dateEntered: 10000-03-15, dateOfAgreement: 2025-01-01",
      },
      {
        scenario: "day is missing",
        day: "",
        month: "03",
        year: "2023",
        error: "Date of review must include a day",
        kind: "dateEntered: 2023-03-, dateOfAgreement: 2025-01-01",
      },
      {
        scenario: "month is missing",
        day: "15",
        month: "",
        year: "2023",
        error: "Date of review must include a month",
        kind: "dateEntered: 2023--15, dateOfAgreement: 2025-01-01",
      },
      {
        scenario: "day and month are missing",
        day: "",
        month: "",
        year: "2023",
        error: "Date of review must include a day and a month",
        kind: "dateEntered: 2023--, dateOfAgreement: 2025-01-01",
      },
      {
        scenario: "day and year are missing",
        day: "",
        month: "03",
        year: "",
        error: "Date of review must include a day and a year",
        kind: "dateEntered: -03-, dateOfAgreement: 2025-01-01",
      },
      {
        scenario: "month and year are missing",
        day: "15",
        month: "",
        year: "",
        error: "Date of review must include a month and a year",
        kind: "dateEntered: --15, dateOfAgreement: 2025-01-01",
      },
      {
        scenario: "year has only 2 digits",
        day: "15",
        month: "03",
        year: "22",
        error: "Year must include 4 numbers",
        kind: "dateEntered: 22-03-15, dateOfAgreement: 2025-01-01",
      },
    ])(
      "redirects back to page with errors when $scenario",
      async ({ day, month, year, error, kind }) => {
        when(getSessionData)
          .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
          .mockReturnValue({
            typeOfReview: "REVIEW",
            previousClaims: [],
            typeOfLivestock: "beef",
            organisation,
            reviewTestResults: "positive",
            reference: "TEMP-6GSE-PIR8",
            latestEndemicsApplication,
          });
        const options = postOptions({ day, month, year });

        const res = await server.inject(options);

        expect(await axe(res.payload)).toHaveNoViolations();
        const $ = cheerio.load(res.payload);
        expect(res.statusCode).toBe(400);
        expect($(".govuk-error-summary__list > li > a").text().trim()).toEqual(error);
        expect(trackEvent).toHaveBeenCalledWith(
          expect.any(Object),
          "claim-invalid-date-of-visit",
          "review",
          {
            kind,
            reason: error,
            reference: "TEMP-6GSE-PIR8",
          },
        );
      },
    );

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
          organisation,
          reviewTestResults: "positive",
          reference: "TEMP-6GSE-PIR8",
          latestEndemicsApplication,
          dateOfVisit: "2025-01-01",
        });
      const options = postOptions({ day: "01", month: "01", year: "2025" });

      const res = await server.inject(options);

      expect(await axe(res.payload)).toHaveNoViolations();
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
          kind: "2025-01-01 is invalid",
          reason: "There must be at least 10 months between your reviews.",
          reference: "TEMP-6GSE-PIR8",
        },
      );
    });
  });

  describe("make review claims", () => {
    test("user makes a review claim and has zero previous claims", async () => {
      // happy path
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
        .mockReturnValue({
          typeOfReview: "REVIEW",
          previousClaims: [],
          typeOfLivestock: "beef",
          organisation,
          reviewTestResults: "positive",
          reference: "TEMP-6GSE-PIR8",
          latestEndemicsApplication,
          dateOfVisit: "2025-01-01",
        });
      const options = postOptions({ day: "01", month: "01", year: "2025" });

      const res = await server.inject(options);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe(livestockClaimRoutes.dateOfTesting);
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
          organisation,
          reviewTestResults: "positive",
          reference: "TEMP-6GSE-PIR8",
          latestEndemicsApplication: {
            ...latestEndemicsApplication,
            createdAt: new Date("2025/01/01 14:30:00"),
          },
          dateOfVisit: "2025-01-01",
        });
      const options = postOptions({ day: "01", month: "01", year: "2025" });

      const res = await server.inject(options);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe(livestockClaimRoutes.dateOfTesting);
      expect(setSessionData).toHaveBeenCalledWith(
        expect.any(Object),
        "endemicsClaim",
        "dateOfVisit",
        new Date(2025, 0, 1),
      );
      expect(trackEvent).not.toHaveBeenCalledWith();
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
          organisation,
          reviewTestResults: "positive",
          reference: "TEMP-6GSE-PIR8",
          latestEndemicsApplication,
          dateOfVisit: "2025-01-01",
        });
      const options = postOptions({ day: "01", month: "01", year: "2025" });

      const res = await server.inject(options);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe(livestockClaimRoutes.dateOfTesting);
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
          organisation,
          reviewTestResults: "positive",
          reference: "TEMP-6GSE-PIR8",
          latestEndemicsApplication,
          dateOfVisit: "2025-02-26",
        });
      const options = postOptions({ day: "26", month: "02", year: "2025" });

      const res = await server.inject(options);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe(livestockClaimRoutes.dateOfTesting);
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
          organisation,
          reviewTestResults: "positive",
          reference: "TEMP-6GSE-PIR8",
          latestEndemicsApplication,
          dateOfVisit: "2025-01-01",
        });
      const options = postOptions({ day: "01", month: "01", year: "2025" });

      const res = await server.inject(options);

      expect(await axe(res.payload)).toHaveNoViolations();
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
            "User is attempting to claim for MS with a date of visit of 2025-01-01 which is before MS was enabled.",
          reference: "TEMP-6GSE-PIR8",
        },
      );
    });
  });

  describe("old world claims", () => {
    test("user has an old world claim, and makes a new world claim over 10 months later for the same species", async () => {
      // happy path
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
        .mockReturnValue({
          typeOfReview: "REVIEW",
          previousClaims: [],
          typeOfLivestock: "beef",
          organisation,
          reviewTestResults: "positive",
          reference: "TEMP-6GSE-PIR8",
          latestVetVisitApplication,
          latestEndemicsApplication,
          dateOfVisit: "2025-01-01",
        });
      const options = postOptions({ day: "01", month: "01", year: "2025" });

      const res = await server.inject(options);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe(livestockClaimRoutes.dateOfTesting);
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
          organisation,
          reviewTestResults: "positive",
          reference: "TEMP-6GSE-PIR8",
          latestVetVisitApplication,
          latestEndemicsApplication,
          dateOfVisit: "2025-01-01",
        });
      const options = postOptions({ day: "01", month: "01", year: "2025" });

      const res = await server.inject(options);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe(livestockClaimRoutes.dateOfTesting);
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
          organisation,
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
      const options = postOptions({ day: "02", month: "01", year: "2025" });

      const res = await server.inject(options);

      expect(await axe(res.payload)).toHaveNoViolations();
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
          kind: "2025-01-02 is invalid",
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
          organisation,
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
      const options = postOptions({ day: "02", month: "01", year: "2025" });

      const res = await server.inject(options);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe(livestockClaimRoutes.dateOfTesting);
      expect(setSessionData).toHaveBeenCalledWith(
        expect.any(Object),
        "endemicsClaim",
        "dateOfVisit",
        new Date(2025, 0, 2),
      );
      expect(trackEvent).not.toHaveBeenCalled();
    });
  });

  describe("make follow up/endemic claim", () => {
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
          organisation,
          reviewTestResults: "positive",
          reference: "TEMP-6GSE-PIR8",
          latestEndemicsApplication,
          dateOfVisit: "2025-01-01",
        });
      const options = postOptions({ day: "01", month: "01", year: "2025" });

      const res = await server.inject(options);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe(livestockClaimRoutes.dateOfTesting);
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
          organisation,
          reviewTestResults: "positive",
          reference: "TEMP-6GSE-PIR8",
          latestEndemicsApplication,
          dateOfVisit: "2025-01-21",
        });
      const options = postOptions({ day: "21", month: "01", year: "2025" });

      const res = await server.inject(options);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe(livestockClaimRoutes.speciesNumbers);
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
          organisation,
          reviewTestResults: "positive",
          reference: "TEMP-6GSE-PIR8",
          latestEndemicsApplication,
          dateOfVisit: "2025-01-20",
        });
      const options = postOptions({ day: "20", month: "01", year: "2025" });

      const res = await server.inject(options);

      expect(await axe(res.payload)).toHaveNoViolations();
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
            "User is attempting to claim for dairy follow-up with a date of visit of 2025-01-20 which is before dairy follow-ups was enabled.",
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
          organisation,
          reviewTestResults: "positive",
          reference: "TEMP-6GSE-PIR8",
          latestEndemicsApplication,
          dateOfVisit: "2025-01-01",
        });
      const options = postOptions({ day: "01", month: "01", year: "2025" });

      const res = await server.inject(options);

      expect(await axe(res.payload)).toHaveNoViolations();
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
          kind: "2025-01-01 is invalid",
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
          organisation,
          reviewTestResults: "positive",
          reference: "TEMP-6GSE-PIR8",
          latestEndemicsApplication,
          dateOfVisit: "2025-02-27",
        });
      const options = postOptions({ day: "27", month: "02", year: "2025" });

      const res = await server.inject(options);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe(livestockClaimRoutes.dateOfTesting);
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
      const options = postOptions({ day: "01", month: "01", year: "2025" });

      const res = await server.inject(options);

      expect(await axe(res.payload)).toHaveNoViolations();
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
          kind: "2025-01-01 is invalid",
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
          organisation,
          reviewTestResults: "positive",
          reference: "TEMP-6GSE-PIR8",
          latestEndemicsApplication,
          dateOfVisit: "2025-01-01",
        });
      const options = postOptions({ day: "01", month: "01", year: "2025" });

      const res = await server.inject(options);

      expect(await axe(res.payload)).toHaveNoViolations();
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
          kind: "2025-01-01 is invalid",
          reason:
            "Your review claim must have been approved before you claim for the follow-up that happened after it.",
          reference: "TEMP-6GSE-PIR8",
        },
      );
    });

    test("user is blocked from a follow-up when their only review is on an old world claim", async () => {
      // unhappy path - a follow-up must be preceded by a review on the new world agreement
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
        .mockReturnValue({
          typeOfReview: "FOLLOW_UP",
          previousClaims: [],
          typeOfLivestock: "beef",
          organisation,
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
      const options = postOptions({ day: "01", month: "01", year: "2025" });

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
        "follow-up",
        {
          reason: "Cannot claim for endemics without a previous review.",
          reference: "TEMP-6GSE-PIR8",
        },
      );
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
          organisation,
          reviewTestResults: "positive",
          reference: "TEMP-6GSE-PIR8",
          latestEndemicsApplication,
          dateOfVisit: "2025-01-01",
        });
      const options = postOptions({ day: "01", month: "01", year: "2025" });

      const res = await server.inject(options);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toEqual(livestockClaimRoutes.dateOfTesting);
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
          organisation,
          reference: "TEMP-6GSE-PIR8",
          latestEndemicsApplication,
          dateOfVisit: "2024-10-01",
        });
      const options = postOptions({ day: "27", month: "02", year: "2025" });

      const res = await server.inject(options);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toEqual(livestockClaimRoutes.dateOfTesting);
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
          organisation,
          reviewTestResults: "negative",
          reference: "TEMP-6GSE-PIR8",
          latestEndemicsApplication,
          dateOfVisit: "2025-01-01",
        });
      const options = postOptions({ day: "01", month: "01", year: "2025" });

      const res = await server.inject(options);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toEqual(livestockClaimRoutes.speciesNumbers);
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
          organisation,
          reviewTestResults: "positive",
          reference: "TEMP-6GSE-PIR8",
          latestEndemicsApplication,
          dateOfVisit: "2025-01-21",
        });
      /* see PI_HUNT_AND_DAIRY_FOLLOW_UP_RELEASE_DATE */
      const options = postOptions({ day: "21", month: "01", year: "2025" });

      const res = await server.inject(options);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toEqual(livestockClaimRoutes.speciesNumbers);
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
          organisation,
          reviewTestResults: "positive",
          reference: "TEMP-6GSE-PIR8",
          latestEndemicsApplication,
          dateOfVisit: "2025-01-20",
        });
      /* see PI_HUNT_AND_DAIRY_FOLLOW_UP_RELEASE_DATE */
      const options = postOptions({ day: "20", month: "01", year: "2025" });

      const res = await server.inject(options);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toEqual(livestockClaimRoutes.dateOfTesting);
      expect(trackEvent).not.toHaveBeenCalled();
    });
  });

  describe("pigs sample data", () => {
    test("clears the previously entered sample data when a pigs claim is before the pigs-and-payments release", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
        .mockReturnValue({
          typeOfReview: "REVIEW",
          previousClaims: [],
          typeOfLivestock: "pigs",
          organisation,
          reviewTestResults: "positive",
          reference: "TEMP-6GSE-PIR8",
          latestVetVisitApplication,
          latestEndemicsApplication,
          dateOfVisit: "2025-01-01",
        });
      /* before PIGS_AND_PAYMENTS_RELEASE_DATE (2026-01-22) */
      const options = postOptions({ day: "01", month: "01", year: "2025" });

      const res = await server.inject(options);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe(livestockClaimRoutes.dateOfTesting);
      expect(setSessionData).toHaveBeenCalledWith(
        expect.any(Object),
        "endemicsClaim",
        "typeOfSamplesTaken",
        undefined,
        { shouldEmitEvent: false },
      );
      expect(setSessionData).toHaveBeenCalledWith(
        expect.any(Object),
        "endemicsClaim",
        "numberOfBloodSamples",
        undefined,
        { shouldEmitEvent: false },
      );
    });

    test("does not clear the sample data when a pigs claim is on or after the pigs-and-payments release", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
        .mockReturnValue({
          typeOfReview: "REVIEW",
          previousClaims: [],
          typeOfLivestock: "pigs",
          organisation,
          reviewTestResults: "positive",
          reference: "TEMP-6GSE-PIR8",
          latestVetVisitApplication,
          /* flag rejecting MH T&Cs keeps us on the non-multiple-herds journey */
          latestEndemicsApplication: {
            ...latestEndemicsApplication,
            flags: [{ appliesToMh: true }],
          },
          dateOfVisit: "2026-01-22",
        });
      /* see PIGS_AND_PAYMENTS_RELEASE_DATE (2026-01-22) */
      const options = postOptions({ day: "22", month: "01", year: "2026" });

      const res = await server.inject(options);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe(livestockClaimRoutes.dateOfTesting);
      expect(setSessionData).not.toHaveBeenCalledWith(
        expect.any(Object),
        "endemicsClaim",
        "typeOfSamplesTaken",
        undefined,
        { shouldEmitEvent: false },
      );
      expect(setSessionData).not.toHaveBeenCalledWith(
        expect.any(Object),
        "endemicsClaim",
        "numberOfBloodSamples",
        undefined,
        { shouldEmitEvent: false },
      );
    });
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
        organisation,
        reviewTestResults: "positive",
        reference: "TEMP-6GSE-PIR8",
        latestEndemicsApplication,
        dateOfVisit: "2025-05-13",
      });
    const options = postOptions({ day: "26", month: "06", year: "2025" });

    const res = await server.inject(options);

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toEqual(livestockClaimRoutes.selectTheHerd);
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
        organisation,
        reviewTestResults: "positive",
        reference: "TEMP-6GSE-PIR8",
        latestEndemicsApplication,
        dateOfVisit: "2025-05-13",
      });
    const options = postOptions({ day: "26", month: "06", year: "2025" });

    const res = await server.inject(options);

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toEqual(livestockClaimRoutes.enterHerdName);
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
              dateOfVisit: "2025-06-26",
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
        organisation,
        reviewTestResults: "positive",
        reference: "TEMP-CBLH-C9CC",
        latestEndemicsApplication,
        dateOfVisit: "2025-04-30",
      });
    const options = postOptions({ day: "30", month: "04", year: "2025" });

    const res = await server.inject(options);

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe(livestockClaimRoutes.speciesNumbers);
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
              dateOfVisit: "2025-06-26",
            },
            herd: {
              id: "fake-herd-id",
            },
          },
        ],
        typeOfLivestock: "dairy",
        organisation,
        reviewTestResults: "positive",
        reference: "TEMP-CBLH-C9CC",
        latestEndemicsApplication,
        dateOfVisit: "2025-04-30",
      });
    const options = postOptions({ day: "30", month: "04", year: "2025" });

    const res = await server.inject(options);

    const $ = cheerio.load(res.payload);
    expect(res.statusCode).toBe(400);
    expect($(".govuk-heading-l").text().trim()).toEqual("You cannot continue with your claim");
    expect(
      $(".govuk-link").filter(function () {
        return $(this).text().trim() === "Tell us if you are claiming for a review or follow up.";
      }),
    ).toHaveLength(1);
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
  test.each([
    {
      scenario:
        "should return url of endemicsVetVisitsReviewTestResults if endemics, old world claim is species of current user journey, and no relevant new world claims",
      whichReview: "beef",
      typeOfReview: "FOLLOW_UP",
      previousClaims: [],
      typeOfLivestock: "beef",
      expected: livestockClaimRoutes.vetVisitsReviewTestResults,
    },
    {
      scenario: "should return url of endemicsWhichTypeOfReview if claim type is review",
      whichReview: "beef",
      typeOfReview: "REVIEW",
      previousClaims: [],
      typeOfLivestock: "beef",
      expected: livestockClaimRoutes.whichTypeOfReview,
    },
    {
      scenario:
        "should return url of endemicsWhichTypeOfReview if old world review type of livestock is not beef or dairy",
      whichReview: "pigs",
      typeOfReview: "FOLLOW_UP",
      previousClaims: [],
      typeOfLivestock: "beef",
      expected: livestockClaimRoutes.whichTypeOfReview,
    },
    {
      scenario:
        "should return url of endemicsWhichTypeOfReview if there are relevant new world claims (i.e. for the same species as the current journey)",
      whichReview: "beef",
      typeOfReview: "FOLLOW_UP",
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
      expected: livestockClaimRoutes.whichTypeOfReview,
    },
  ])("$scenario", ({ whichReview, typeOfReview, previousClaims, typeOfLivestock, expected }) => {
    const latestVetVisitApplication = {
      data: {
        whichReview,
      },
    };

    expect(
      previousPageUrl(latestVetVisitApplication, typeOfReview, previousClaims, typeOfLivestock),
    ).toBe(expected);
  });
});

import * as cheerio from "cheerio";
import { createServer } from "../../../../../app/server.js";
import expectPhaseBanner from "assert";
import { getCrumbs } from "../../../../utils/get-crumbs.js";
import {
  isMultipleHerdsUserJourney,
  isVisitDateAfterPIHuntAndDairyGoLive,
  skipSameHerdPage,
} from "../../../../../app/lib/context-helper.js";
import HttpStatus from "http-status-codes";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../../../../app/session/index.js";
import { sendInvalidDataEvent } from "../../../../../app/messaging/ineligibility-event-emission.js";
import { when } from "jest-when";
import { axe } from "../../../../helpers/axe-helper.js";

jest.mock("../../../../../app/messaging/ineligibility-event-emission.js");
jest.mock("../../../../../app/session");
jest.mock("../../../../../app/lib/context-helper.js", () => ({
  ...jest.requireActual("../../../../../app/lib/context-helper.js"),
  isMultipleHerdsUserJourney: jest.fn(),
  isVisitDateAfterPIHuntAndDairyGoLive: jest.fn(),
  skipSameHerdPage: jest.fn(),
}));

let crumb;
const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(today.getDate() + 1);
const auth = { credentials: {}, strategy: "cookie" };
const url = "/date-of-testing";

const latestEndemicsApplication = {
  reference: "AHWR-2470-6BA9",
  createdAt: new Date("2022-01-01"),
  status: "AGREED",
  type: "EE",
};

const stubCommonSessionKeys = () => {
  when(getSessionData)
    .calledWith(
      expect.anything(),
      sessionEntryKeys.endemicsClaim,
      sessionKeys.endemicsClaim.latestEndemicsApplication,
    )
    .mockReturnValue({ status: "AGREED" });

  when(getSessionData)
    .calledWith(expect.anything(), sessionEntryKeys.confirmedDetails, sessionKeys.confirmedDetails)
    .mockReturnValue(true);

  when(getSessionData)
    .calledWith(
      expect.anything(),
      sessionEntryKeys.endemicsClaim,
      sessionKeys.endemicsClaim.reference,
    )
    .mockReturnValue("IAHW-1LZ5-ELVQ");
};

describe("Date of testing", () => {
  let server;

  beforeAll(async () => {
    server = await createServer();
    await server.initialize();
    isVisitDateAfterPIHuntAndDairyGoLive.mockImplementation(() => {
      return true;
    });
  });

  beforeEach(() => {
    stubCommonSessionKeys();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await server.stop();
    jest.resetAllMocks();
  });

  describe(`GET ${url} route`, () => {
    test.each([{ typeOfLivestock: "beef" }, { typeOfLivestock: "dairy" }])(
      "returns 200",
      async ({ typeOfLivestock }) => {
        when(getSessionData)
          .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
          .mockReturnValue({
            typeOfReview: "FOLLOW_UP",
            typeOfLivestock,
            latestEndemicsApplication,
            reference: "TEMP-6GSE-PIR8",
            dateOfVisit: "2022-01-01",
          });

        const options = {
          method: "GET",
          url,
          auth,
        };

        const res = await server.inject(options);

        expect(await axe(res.payload)).toHaveNoViolations();
        expect(res.statusCode).toBe(HttpStatus.OK);
        const $ = cheerio.load(res.payload);
        expect($(".govuk-back-link").attr("href")).toMatch("/pi-hunt-all-animals");
        expectPhaseBanner.ok($);
        expect($("#whenTestingWasCarriedOut-hint").text()).toMatch(
          "This is the date samples were last taken for this follow-up. You can find it on the summary the vet gave you.",
        );
      },
    );

    test("shows the review wording for the same-date option on a review claim", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
        .mockReturnValue({
          typeOfReview: "REVIEW",
          typeOfLivestock: "beef",
          latestEndemicsApplication,
          reference: "TEMP-6GSE-PIR8",
          dateOfVisit: "2022-01-01",
        });

      const res = await server.inject({ method: "GET", url, auth });

      expect(await axe(res.payload)).toHaveNoViolations();
      expect(res.statusCode).toBe(HttpStatus.OK);
      const $ = cheerio.load(res.payload);
      expect($("label[for=whenTestingWasCarriedOut]").text()).toContain(
        "When the vet last visited the farm for the review",
      );
      expect($("#whenTestingWasCarriedOut-hint").text()).toMatch(
        "This is the date samples were last taken for this review. You can find it on the summary the vet gave you.",
      );
    });

    test("pre-selects the vet-visit option when the stored sampling date matches the visit date", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
        .mockReturnValue({
          typeOfReview: "FOLLOW_UP",
          typeOfLivestock: "beef",
          latestEndemicsApplication,
          reference: "TEMP-6GSE-PIR8",
          dateOfVisit: "2024-05-01",
          dateOfTesting: "2024-05-01",
        });

      const res = await server.inject({ method: "GET", url, auth });

      expect(await axe(res.payload)).toHaveNoViolations();
      expect(res.statusCode).toBe(HttpStatus.OK);
      const $ = cheerio.load(res.payload);
      expect(
        $('input[value="whenTheVetVisitedTheFarmToCarryOutTheReview"]').attr("checked"),
      ).toBeDefined();
      expect($('input[value="onAnotherDate"]').attr("checked")).toBeUndefined();
    });

    test("pre-fills the other-date fields when the stored sampling date differs from the visit date", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
        .mockReturnValue({
          typeOfReview: "FOLLOW_UP",
          typeOfLivestock: "beef",
          latestEndemicsApplication,
          reference: "TEMP-6GSE-PIR8",
          dateOfVisit: "2024-05-01",
          dateOfTesting: "2024-03-15",
        });

      const res = await server.inject({ method: "GET", url, auth });

      expect(await axe(res.payload)).toHaveNoViolations();
      expect(res.statusCode).toBe(HttpStatus.OK);
      const $ = cheerio.load(res.payload);
      expect($('input[value="onAnotherDate"]').attr("checked")).toBeDefined();
      expect($("#on-another-date-day").val()).toBe("15");
      expect($("#on-another-date-month").val()).toBe("3");
      expect($("#on-another-date-year").val()).toBe("2024");
    });
  });

  describe(`POST ${url} route`, () => {
    beforeEach(async () => {
      crumb = await getCrumbs(server);
    });

    test("redirects with an error if the user doesnt enter anything", async () => {
      getSessionData.mockImplementation(() => ({
        dateOfVisit: "2024-01-01",
        typeOfReview: "FOLLOW_UP",
        typeOfLivestock: "sheep",
        previousClaims: [
          {
            type: "REVIEW",
            data: {
              typeOfLivestock: "beef",
              dateOfVisit: "2024-01-01",
            },
          },
        ],
        latestEndemicsApplication,
      }));
      const options = {
        method: "POST",
        url,
        payload: {
          crumb,
          whenTestingWasCarriedOut: undefined,
        },
        auth,
        headers: { cookie: `crumb=${crumb}` },
      };

      const res = await server.inject(options);

      expect(await axe(res.payload)).toHaveNoViolations();
      const $ = cheerio.load(res.payload);
      const errorMessage = "Enter the date samples were taken";

      expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
      expect($("li > a").text().trim()).toContain(errorMessage);
    });

    test("redirects with an error if the user selects it was a different date, but doesnt enter a date", async () => {
      getSessionData.mockImplementation(() => ({
        dateOfVisit: "2024-01-01",
        typeOfReview: "FOLLOW_UP",
        typeOfLivestock: "sheep",
        previousClaims: [
          {
            type: "REVIEW",
            data: {
              typeOfLivestock: "beef",
              dateOfVisit: "2024-01-01",
            },
          },
        ],
        latestEndemicsApplication,
      }));
      const options = {
        method: "POST",
        url,
        payload: {
          crumb,
          whenTestingWasCarriedOut: "onAnotherDate",
          "on-another-date-day": undefined,
          "on-another-date-month": undefined,
          "on-another-date-year": undefined,
        },
        auth,
        headers: { cookie: `crumb=${crumb}` },
      };

      const res = await server.inject(options);

      expect(await axe(res.payload)).toHaveNoViolations();
      const $ = cheerio.load(res.payload);

      expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
      expect($("li > a").text().trim()).toContain('"on-another-date-day" is required');
    });

    test.each([
      {
        typeOfLivestock: "beef",
      },
      {
        typeOfLivestock: "dairy",
      },
    ])(
      "returns 302 to next page when acceptable answer given - When vet visited the farm",
      async ({ typeOfLivestock }) => {
        getSessionData.mockImplementation(() => {
          return { dateOfVisit: today, typeOfReview: "FOLLOW_UP", typeOfLivestock };
        });

        const options = {
          method: "POST",
          url,
          payload: {
            crumb,
            whenTestingWasCarriedOut: "whenTheVetVisitedTheFarmToCarryOutTheReview",
            dateOfVisit: today,
            dateOfAgreementAccepted: "2022-01-01",
          },
          auth,
          headers: { cookie: `crumb=${crumb}` },
        };

        const res = await server.inject(options);
        expect(res.statusCode).toBe(HttpStatus.MOVED_TEMPORARILY);
        expect(res.headers.location).toEqual("/test-urn");
      },
    );

    test("redirects to species numbers when endemics claim and previous review claim of different species with date of testing less than date of visit", async () => {
      getSessionData.mockRestore();
      getSessionData.mockImplementation(() => ({
        dateOfVisit: "2024-01-01",
        typeOfReview: "FOLLOW_UP",
        typeOfLivestock: "sheep",
        previousClaims: [
          {
            type: "REVIEW",
            data: {
              typeOfLivestock: "beef",
              dateOfVisit: "2024-01-01",
            },
          },
        ],
      }));
      const options = {
        method: "POST",
        url,
        payload: {
          crumb,
          whenTestingWasCarriedOut: "onAnotherDate",
          dateOfVisit: "2024-01-01",
          dateOfAgreementAccepted: "2022-01-01",
          "on-another-date-day": "01",
          "on-another-date-month": "12",
          "on-another-date-year": "2023",
        },
        auth,
        headers: { cookie: `crumb=${crumb}` },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(HttpStatus.MOVED_TEMPORARILY);
      expect(res.headers.location).toEqual("/species-numbers");
      expect(sendInvalidDataEvent).toHaveBeenCalledTimes(0);
    });

    test("review claim proceeds to species numbers even when sampling date is before a previous review of the same species", async () => {
      getSessionData.mockImplementation(() => ({
        dateOfVisit: "2024-01-01",
        typeOfReview: "REVIEW",
        typeOfLivestock: "beef",
        previousClaims: [
          {
            type: "REVIEW",
            data: {
              typeOfLivestock: "beef",
              dateOfVisit: "2024-01-01",
            },
          },
        ],
      }));
      const options = {
        method: "POST",
        url,
        payload: {
          crumb,
          whenTestingWasCarriedOut: "onAnotherDate",
          dateOfVisit: "2024-01-01",
          dateOfAgreementAccepted: "2022-01-01",
          "on-another-date-day": "01",
          "on-another-date-month": "12",
          "on-another-date-year": "2023",
        },
        auth,
        headers: { cookie: `crumb=${crumb}` },
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(HttpStatus.MOVED_TEMPORARILY);
      expect(res.headers.location).toEqual("/species-numbers");
      expect(sendInvalidDataEvent).toHaveBeenCalledTimes(0);
    });

    describe("Saving information", () => {
      test("saves the visit date as the sampling date when the vet-visit option is chosen", async () => {
        getSessionData.mockImplementation(() => ({
          dateOfVisit: today,
          typeOfReview: "FOLLOW_UP",
          typeOfLivestock: "beef",
        }));
        const options = {
          method: "POST",
          url,
          payload: {
            crumb,
            whenTestingWasCarriedOut: "whenTheVetVisitedTheFarmToCarryOutTheReview",
            dateOfVisit: today,
            dateOfAgreementAccepted: "2022-01-01",
          },
          auth,
          headers: { cookie: `crumb=${crumb}` },
        };

        const res = await server.inject(options);

        expect(res.statusCode).toBe(HttpStatus.MOVED_TEMPORARILY);
        expect(setSessionData).toHaveBeenCalledWith(
          expect.any(Object),
          "endemicsClaim",
          "dateOfTesting",
          today,
        );
      });

      test("saves the entered sampling date when another date is chosen", async () => {
        getSessionData.mockImplementation(() => ({
          dateOfVisit: "2024-01-01",
          typeOfReview: "FOLLOW_UP",
          typeOfLivestock: "sheep",
          previousClaims: [
            {
              type: "REVIEW",
              data: {
                typeOfLivestock: "beef",
                dateOfVisit: "2024-01-01",
              },
            },
          ],
        }));
        const options = {
          method: "POST",
          url,
          payload: {
            crumb,
            whenTestingWasCarriedOut: "onAnotherDate",
            dateOfVisit: "2024-01-01",
            dateOfAgreementAccepted: "2022-01-01",
            "on-another-date-day": "01",
            "on-another-date-month": "12",
            "on-another-date-year": "2023",
          },
          auth,
          headers: { cookie: `crumb=${crumb}` },
        };

        const res = await server.inject(options);

        expect(res.statusCode).toBe(HttpStatus.MOVED_TEMPORARILY);
        expect(setSessionData).toHaveBeenCalledWith(
          expect.any(Object),
          "endemicsClaim",
          "dateOfTesting",
          new Date(2023, 11, 1),
        );
      });
    });

    describe("date checks", () => {
      test.each([
        {
          scenario: "the date is incomplete",
          day: "15",
          month: "03",
          year: "",
          error: "Date of sampling must include a year",
        },
        {
          scenario: "the day cannot exist for the month entered",
          day: "31",
          month: "02",
          year: "2023",
          error: "Date of sampling must be a real date",
        },
        {
          scenario: "the year is out of range",
          day: "15",
          month: "03",
          year: "10000",
          error: "Year must include 4 numbers",
        },
      ])("redirects with an error when $scenario", async ({ day, month, year, error }) => {
        getSessionData.mockImplementation(() => ({
          dateOfVisit: "2024-01-01",
          typeOfReview: "FOLLOW_UP",
          typeOfLivestock: "beef",
          latestEndemicsApplication,
        }));
        const res = await server.inject({
          method: "POST",
          url,
          payload: {
            crumb,
            whenTestingWasCarriedOut: "onAnotherDate",
            dateOfVisit: "2024-01-01",
            dateOfAgreementAccepted: "2022-01-01",
            "on-another-date-day": day,
            "on-another-date-month": month,
            "on-another-date-year": year,
          },
          auth,
          headers: { cookie: `crumb=${crumb}` },
        });

        expect(await axe(res.payload)).toHaveNoViolations();
        const $ = cheerio.load(res.payload);
        expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
        expect($(".govuk-error-summary__list a").text()).toContain(error);
      });

      test("redirects with an error if the sampling date is in the future", async () => {
        getSessionData.mockImplementation(() => ({
          dateOfVisit: "2024-01-01",
          typeOfReview: "FOLLOW_UP",
          typeOfLivestock: "beef",
          latestEndemicsApplication,
        }));
        const options = {
          method: "POST",
          url,
          payload: {
            crumb,
            whenTestingWasCarriedOut: "onAnotherDate",
            dateOfVisit: "2024-01-01",
            dateOfAgreementAccepted: "2022-01-01",
            "on-another-date-day": `${tomorrow.getDate()}`,
            "on-another-date-month": `${tomorrow.getMonth() + 1}`,
            "on-another-date-year": `${tomorrow.getFullYear()}`,
          },
          auth,
          headers: { cookie: `crumb=${crumb}` },
        };

        const res = await server.inject(options);

        expect(await axe(res.payload)).toHaveNoViolations();
        const $ = cheerio.load(res.payload);

        expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
        expect($("li > a").text().trim()).toContain(
          "The date samples were taken must be in the past",
        );
      });

      test("redirects with an error if the sampling date is before the agreement date", async () => {
        getSessionData.mockImplementation(() => ({
          dateOfVisit: "2024-01-01",
          typeOfReview: "FOLLOW_UP",
          typeOfLivestock: "beef",
          latestEndemicsApplication,
        }));
        const options = {
          method: "POST",
          url,
          payload: {
            crumb,
            whenTestingWasCarriedOut: "onAnotherDate",
            dateOfVisit: "2024-01-01",
            dateOfAgreementAccepted: "2022-01-01",
            "on-another-date-day": "31",
            "on-another-date-month": "12",
            "on-another-date-year": "2021",
          },
          auth,
          headers: { cookie: `crumb=${crumb}` },
        };

        const res = await server.inject(options);

        expect(await axe(res.payload)).toHaveNoViolations();
        const $ = cheerio.load(res.payload);

        expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
        expect($("li > a").text().trim()).toContain(
          "The date samples were taken must be the same as or after the date of your agreement",
        );
      });

      test("redirects to date of testing exception when endemics claim and previous review claim of same species with date of testing less than date of visit", async () => {
        getSessionData.mockRestore();
        getSessionData.mockImplementation(() => ({
          dateOfVisit: "2024-01-01",
          typeOfReview: "FOLLOW_UP",
          typeOfLivestock: "sheep",
          previousClaims: [
            {
              type: "REVIEW",
              data: {
                typeOfLivestock: "sheep",
                dateOfVisit: "2024-01-01",
              },
            },
          ],
        }));

        const options = {
          method: "POST",
          url,
          payload: {
            crumb,
            whenTestingWasCarriedOut: "onAnotherDate",
            dateOfVisit: "2024-01-01",
            dateOfAgreementAccepted: "2022-01-01",
            "on-another-date-day": "01",
            "on-another-date-month": "12",
            "on-another-date-year": "2023",
          },
          auth,
          headers: { cookie: `crumb=${crumb}` },
        };

        const res = await server.inject(options);

        expect(await axe(res.payload)).toHaveNoViolations();
        const $ = cheerio.load(res.payload);

        expect(res.statusCode).toBe(HttpStatus.BAD_REQUEST);
        expect(sendInvalidDataEvent).toHaveBeenCalledTimes(1);
        expect($(".govuk-body").text()).toContain(
          "You must do a review, including sampling, before you do the resulting follow-up.",
        );
      });

      test("emits an invalid event when the date of visit is over 4 months away from the date of testing", async () => {
        getSessionData.mockImplementation(() => ({
          dateOfVisit: "2024-01-01",
          typeOfReview: "FOLLOW_UP",
          typeOfLivestock: "sheep",
          previousClaims: [
            {
              type: "REVIEW",
              data: {
                typeOfLivestock: "beef",
                dateOfVisit: "2024-01-01",
              },
            },
          ],
        }));
        const options = {
          method: "POST",
          url,
          payload: {
            crumb,
            whenTestingWasCarriedOut: "onAnotherDate",
            dateOfVisit: "2024-01-01",
            dateOfAgreementAccepted: "2022-01-01",
            "on-another-date-day": "01",
            "on-another-date-month": "01",
            "on-another-date-year": "2023",
          },
          auth,
          headers: { cookie: `crumb=${crumb}` },
        };

        const res = await server.inject(options);

        expect(sendInvalidDataEvent).toHaveBeenCalled();
        expect(res.statusCode).toBe(HttpStatus.MOVED_TEMPORARILY);
        expect(res.headers.location).toEqual("/species-numbers");
      });
    });
  });
});

describe("Date of testing when isMultipleHerdsUserJourney=true", () => {
  let server;

  beforeAll(async () => {
    server = await createServer();
    await server.initialize();
    isMultipleHerdsUserJourney.mockImplementation(() => {
      return true;
    });

    stubCommonSessionKeys();
  });
  afterAll(async () => {
    await server.stop();
    jest.resetAllMocks();
  });

  test("returns 200 and correct backlink when skipSameHerdPage=true", async () => {
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
      .mockReturnValue({
        typeOfReview: "FOLLOW_UP",
        typeOfLivestock: "beef",
        latestEndemicsApplication: { createdAt: new Date("2022-01-01") },
        reference: "TEMP-6GSE-PIR8",
        previousClaims: [],
      });

    const res = await server.inject({ method: "GET", url, auth });

    expect(await axe(res.payload)).toHaveNoViolations();
    expect(res.statusCode).toBe(HttpStatus.OK);
    const $ = cheerio.load(res.payload);
    expect($(".govuk-back-link").attr("href")).toMatch("/check-herd-details");
  });

  test("returns 200 and correct backlink when skipSameHerdPage=false", async () => {
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
      .mockReturnValue({
        typeOfReview: "FOLLOW_UP",
        typeOfLivestock: "beef",
        latestEndemicsApplication: { createdAt: new Date("2022-01-01") },
        reference: "TEMP-6GSE-PIR8",
        previousClaims: [{ data: { typeOfLivestock: "beef" } }],
      });

    const res = await server.inject({ method: "GET", url, auth });

    expect(await axe(res.payload)).toHaveNoViolations();
    expect(res.statusCode).toBe(HttpStatus.OK);
    const $ = cheerio.load(res.payload);
    expect($(".govuk-back-link").attr("href")).toMatch("/same-herd");
  });

  test("returns 200 and correct backlink when beef follow-up post PIHuntAndDairy golive", async () => {
    when(getSessionData)
      .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
      .mockReturnValue({
        typeOfReview: "FOLLOW_UP",
        typeOfLivestock: "beef",
        latestEndemicsApplication: { createdAt: new Date("2025-06-06") },
        reference: "TEMP-6GSE-PIR8",
      });
    skipSameHerdPage.mockImplementation(() => {
      return true;
    });
    isVisitDateAfterPIHuntAndDairyGoLive.mockImplementation(() => {
      return true;
    });

    const res = await server.inject({ method: "GET", url, auth });

    expect(await axe(res.payload)).toHaveNoViolations();
    expect(res.statusCode).toBe(HttpStatus.OK);
    const $ = cheerio.load(res.payload);
    expect($(".govuk-back-link").attr("href")).toMatch("/pi-hunt-all-animals");
  });
});

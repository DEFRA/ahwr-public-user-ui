import * as cheerio from "cheerio";
import { createServer } from "../../../../../../app/server.js";
import { config } from "../../../../../../app/config/index.js";
import { getCrumbs } from "../../../../../utils/get-crumbs.js";
import {
  getSessionData,
  sessionEntryKeys,
  sessionKeys,
  setSessionData,
} from "../../../../../../app/session/index.js";
import { when } from "jest-when";
import { axe } from "../../../../../helpers/axe-helper.js";
import {
  testBrowserPageTitle,
  testPageHeading,
} from "../../../../../helpers/page-title-and-heading.js";
import { testRedirectsToSignInWhenLoggedOut } from "../../../../../helpers/sign-in-redirect.js";

jest.mock("../../../../../../app/messaging/ineligibility-event-emission.js");
jest.mock("../../../../../../app/session/index.js");
jest.mock("../../../../../../app/lib/context-helper.js");

const url = `/poultry/improvements`;
const auth = {
  credentials: { reference: "1111", sbi: "111111111" },
  strategy: "cookie",
};
let crumb;

describe("/poultry/improvements", () => {
  let server;

  beforeEach(async () => {
    crumb = await getCrumbs(server);
  });

  beforeAll(async () => {
    server = await createServer();
    await server.initialize();
    setSessionData.mockImplementation(() => {});

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

  afterAll(async () => {
    jest.resetAllMocks();
    await server.stop();
  });

  describe("when the improvements page is disabled", () => {
    beforeEach(() => {
      config.poultry.disableInterviewPage = true;
    });

    test("GET redirects straight to check answers without loading the page", async () => {
      const response = await server.inject({ method: "GET", url, auth });

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toEqual("/poultry/check-answers");
    });

    test("POST redirects straight to check answers and does not store biosecurityImprovements data", async () => {
      const options = {
        method: "POST",
        auth,
        url,
        headers: { cookie: `crumb=${crumb}` },
        payload: { crumb, biosecurityImprovements: "yes" },
      };

      const response = await server.inject(options);

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toEqual("/poultry/check-answers");
      expect(setSessionData).not.toHaveBeenCalledWith(
        expect.any(Object),
        "poultryClaim",
        "biosecurityImprovements",
        expect.anything(),
      );
    });
  });

  describe("when the improvements page is enabled (default)", () => {
    beforeEach(() => {
      config.poultry.disableInterviewPage = false;
    });

    describe(`GET ${url} route`, () => {
      testRedirectsToSignInWhenLoggedOut({
        getResponse: () => server.inject({ method: "GET", url }),
      });

      const getResponse = () => {
        when(getSessionData)
          .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
          .mockReturnValue({});
        return server.inject({ method: "GET", url, auth });
      };

      const browserTitle =
        "Did the review identify biosecurity improvements that you had previously not known about?";
      const pageHeader =
        "Did the review identify biosecurity improvements that you had previously not known about?";
      testBrowserPageTitle({ title: browserTitle, getResponse });
      testPageHeading({ heading: pageHeader, getResponse });

      test("selects 'yes' when previously selected", async () => {
        const options = {
          method: "GET",
          auth,
          url,
        };

        when(getSessionData)
          .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
          .mockReturnValue({
            biosecurityImprovements: "yes",
          });

        const response = await server.inject(options);

        expect(await axe(response.payload)).toHaveNoViolations();
        const $ = cheerio.load(response.payload);

        expect($('input[name="biosecurityImprovements"]:checked').val()).toEqual("yes");
        expect($(".govuk-back-link").text()).toMatch("Back");
      });

      test("selects 'no' when previously selected", async () => {
        const options = {
          method: "GET",
          auth,
          url,
        };

        when(getSessionData)
          .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
          .mockReturnValue({
            biosecurityImprovements: "no",
          });

        const response = await server.inject(options);

        expect(await axe(response.payload)).toHaveNoViolations();
        const $ = cheerio.load(response.payload);

        expect($('input[name="biosecurityImprovements"]:checked').val()).toEqual("no");
      });

      describe(`POST ${url}`, () => {
        test("show error when biosecurityImprovements answer not selected", async () => {
          const options = {
            method: "POST",
            auth,
            url,
            headers: { cookie: `crumb=${crumb}` },
            payload: { crumb, biosecurityImprovements: "", assessmentPercentage: "" },
          };

          const response = await server.inject(options);

          expect(await axe(response.payload)).toHaveNoViolations();
          const $ = cheerio.load(response.payload);
          const errorMessage = "Select if new biosecurity improvements were identified";

          expect($("li > a").text()).toMatch(errorMessage);
        });

        test("continue to next page when biosecurityImprovements answer has been selected", async () => {
          const options = {
            method: "POST",
            auth,
            url,
            headers: { cookie: `crumb=${crumb}` },
            payload: { crumb, biosecurityImprovements: "yes" },
          };

          const response = await server.inject(options);

          expect(response.statusCode).toBe(302);
          expect(response.headers.location).toEqual(`/poultry/check-answers`);
          expect(setSessionData).toHaveBeenCalledWith(
            expect.any(Object),
            "poultryClaim",
            "biosecurityImprovements",
            "yes",
          );
        });
      });
    });
  });
});

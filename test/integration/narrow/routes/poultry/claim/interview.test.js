import * as cheerio from "cheerio";
import { createServer } from "../../../../../../app/server.js";
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

const url = `/poultry/interview`;
const auth = {
  credentials: { reference: "1111", sbi: "111111111" },
  strategy: "cookie",
};
let crumb;

describe("/poultry/interview", () => {
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
      "Follow-up interview about your experience of the poultry biosecurity review scheme";
    const pageHeader =
      "Would you be willing to take part in a short follow-up interview about your experience of this scheme?";
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
          interview: "yes",
        });

      const response = await server.inject(options);

      expect(await axe(response.payload)).toHaveNoViolations();
      const $ = cheerio.load(response.payload);

      expect($('input[name="interview"]:checked').val()).toEqual("yes");
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
          interview: "no",
        });

      const response = await server.inject(options);

      expect(await axe(response.payload)).toHaveNoViolations();
      const $ = cheerio.load(response.payload);

      expect($('input[name="interview"]:checked').val()).toEqual("no");
    });

    describe(`POST ${url}`, () => {
      test("show error when interview answer not selected", async () => {
        const options = {
          method: "POST",
          auth,
          url,
          headers: { cookie: `crumb=${crumb}` },
          payload: { crumb, interview: "", assessmentPercentage: "" },
        };

        const response = await server.inject(options);

        expect(await axe(response.payload)).toHaveNoViolations();
        const $ = cheerio.load(response.payload);
        const errorMessage = "Select if you want to take part";

        expect($("li > a").text()).toMatch(errorMessage);
      });

      test("continue to next page when interview answer has been selected", async () => {
        const options = {
          method: "POST",
          auth,
          url,
          headers: { cookie: `crumb=${crumb}` },
          payload: { crumb, interview: "yes" },
        };

        const response = await server.inject(options);

        expect(response.statusCode).toBe(302);
        expect(response.headers.location).toEqual(`/poultry/check-answers`);
        expect(setSessionData).toHaveBeenCalledWith(
          expect.any(Object),
          "poultryClaim",
          "interview",
          "yes",
        );
      });
    });
  });
});

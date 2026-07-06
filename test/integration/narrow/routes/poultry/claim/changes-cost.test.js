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

jest.mock("../../../../../../app/session/index.js");
jest.mock("../../../../../../app/lib/context-helper.js");

const url = `/poultry/changes-cost`;
const auth = {
  credentials: { reference: "1111", sbi: "111111111" },
  strategy: "cookie",
};
let crumb;

describe("/poultry/changes-cost", () => {
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
    const browserTitle = "Expected spend for poultry biosecurity changes";
    const pageHeader = "How much do you expect to spend on recommended biosecurity changes?";
    testBrowserPageTitle({ title: browserTitle, getResponse });
    testPageHeading({ heading: pageHeader, getResponse });

    test.each([
      { previousAnswer: "0-1500" },
      { previousAnswer: "1500-3000" },
      { previousAnswer: "3000-4500" },
      { previousAnswer: "over-4500" },
      { previousAnswer: "not-sure" },
      { previousAnswer: "no-intention" },
    ])("selects $previousAnswer when previously selected", async ({ previousAnswer }) => {
      const options = {
        method: "GET",
        auth,
        url,
      };

      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          costOfChanges: previousAnswer,
        });

      const response = await server.inject(options);

      expect(await axe(response.payload)).toHaveNoViolations();
      const $ = cheerio.load(response.payload);

      expect($('input[name="costOfChanges"]:checked').val()).toEqual(previousAnswer);
      expect($(".govuk-back-link").text()).toMatch("Back");
    });

    describe(`POST ${url}`, () => {
      test("show error when biosecurity cost of changes answer not selected", async () => {
        const options = {
          method: "POST",
          auth,
          url,
          headers: { cookie: `crumb=${crumb}` },
          payload: { crumb, costOfChanges: "" },
        };

        const response = await server.inject(options);

        expect(await axe(response.payload)).toHaveNoViolations();
        const $ = cheerio.load(response.payload);
        const errorMessage = "Select your estimate";

        expect($("li > a").text()).toMatch(errorMessage);
      });

      test("continue to next page when answer is selected", async () => {
        const options = {
          method: "POST",
          auth,
          url,
          headers: { cookie: `crumb=${crumb}` },
          payload: { crumb, costOfChanges: "not-sure" },
        };

        const response = await server.inject(options);

        expect(response.statusCode).toBe(302);
        expect(response.headers.location).toEqual(`/poultry/interview`);
        expect(setSessionData).toHaveBeenCalledWith(
          expect.any(Object),
          "poultryClaim",
          "costOfChanges",
          "not-sure",
        );
      });

      test("displays error when it receives an unknown value", async () => {
        const options = {
          method: "POST",
          auth,
          url,
          headers: { cookie: `crumb=${crumb}` },
          payload: { crumb, costOfChanges: "not-valid" },
        };

        const response = await server.inject(options);

        expect(await axe(response.payload)).toHaveNoViolations();
        const $ = cheerio.load(response.payload);
        const errorMessage = "Select your estimate";

        expect($("li > a").text()).toMatch(errorMessage);
      });
    });
  });
});

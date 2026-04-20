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
import { config } from "../../../../../../app/config/index.js";

jest.mock("../../../../../../app/session/index.js");
jest.mock("../../../../../../app/lib/context-helper.js");

const url = `/poultry/changes-in-biosecurity`;
const auth = {
  credentials: { reference: "1111", sbi: "111111111" },
  strategy: "cookie",
};
let crumb;

describe("/poultry/changes-in-biosecurity", () => {
  let server;

  beforeEach(async () => {
    crumb = await getCrumbs(server);
  });

  beforeAll(async () => {
    config.poultry.enabled = true;
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
  });

  afterAll(async () => {
    jest.resetAllMocks();
    await server.stop();
  });

  describe(`GET ${url} route`, () => {
    test("redirect if not logged in / authorized", async () => {
      const options = {
        method: "GET",
        url,
      };

      const response = await server.inject(options);

      expect(response.statusCode).toBe(302);
      expect(response.headers.location.toString()).toEqual(`/sign-in`);
    });

    test("display question text", async () => {
      const options = {
        method: "GET",
        url,
        auth,
      };
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({});

      const response = await server.inject(options);

      expect(await axe(response.payload)).toHaveNoViolations();
      const $ = cheerio.load(response.payload);
      expect($("title").text()).toMatch(
        "What was the main change the vet recommended to improve your farm's biosecurity? - Get funding to improve animal health and welfare",
      );
      expect($("h1").text()).toMatch(
        "What was the main change the vet recommended to improve your farm's biosecurity?",
      );
    });

    test.each([
      { previousAnswer: "infra-and-control" },
      { previousAnswer: "people-and-hygiene" },
      { previousAnswer: "movement-and-management" },
      { previousAnswer: "bird-handling" },
      { previousAnswer: "cleaning" },
      { previousAnswer: "no-recommendation" },
    ])("selects $previousAnswer when previously selected", async ({ previousAnswer }) => {
      const options = {
        method: "GET",
        auth,
        url,
      };

      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          changesInBiosecurity: previousAnswer,
        });

      const response = await server.inject(options);

      expect(await axe(response.payload)).toHaveNoViolations();
      const $ = cheerio.load(response.payload);

      expect($('input[name="changesInBiosecurity"]:checked').val()).toEqual(previousAnswer);
      expect($(".govuk-back-link").text()).toMatch("Back");
    });

    describe(`POST ${url}`, () => {
      test("show error when changes in biosecurity answer not selected", async () => {
        const options = {
          method: "POST",
          auth,
          url,
          headers: { cookie: `crumb=${crumb}` },
          payload: { crumb, changesInBiosecurity: "" },
        };

        const response = await server.inject(options);

        expect(await axe(response.payload)).toHaveNoViolations();
        const $ = cheerio.load(response.payload);
        const errorMessage = "Select an option";

        expect($("li > a").text()).toMatch(errorMessage);
      });

      test("continue to next page when answer is selected", async () => {
        const options = {
          method: "POST",
          auth,
          url,
          headers: { cookie: `crumb=${crumb}` },
          payload: { crumb, changesInBiosecurity: "no-recommendation" },
        };

        const response = await server.inject(options);

        expect(response.statusCode).toBe(302);
        expect(response.headers.location).toEqual(`/poultry/cost-of-changes`);
        expect(setSessionData).toHaveBeenCalledWith(
          expect.any(Object),
          "poultryClaim",
          "changesInBiosecurity",
          "no-recommendation",
        );
      });

      test("displays error when it receives an unknown value", async () => {
        const options = {
          method: "POST",
          auth,
          url,
          headers: { cookie: `crumb=${crumb}` },
          payload: { crumb, changesInBiosecurity: "not-valid" },
        };

        const response = await server.inject(options);

        expect(await axe(response.payload)).toHaveNoViolations();
        const $ = cheerio.load(response.payload);
        const errorMessage = "Select an option";

        expect($("li > a").text()).toMatch(errorMessage);
      });
    });
  });
});

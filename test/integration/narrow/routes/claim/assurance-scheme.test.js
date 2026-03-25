import * as cheerio from "cheerio";
import { createServer } from "../../../../../app/server.js";
import { getCrumbs } from "../../../../utils/get-crumbs.js";
import {
  getSessionData,
  sessionEntryKeys,
  sessionKeys,
  setSessionData,
} from "../../../../../app/session/index.js";

import { when } from "jest-when";
import { axe } from "../../../../helpers/axe-helper.js";

jest.mock("../../../../../app/messaging/ineligibility-event-emission.js");
jest.mock("../../../../../app/session/index.js");
jest.mock("../../../../../app/lib/context-helper.js");

const url = `/assurance-scheme`;
const auth = {
  credentials: { reference: "1111", sbi: "111111111" },
  strategy: "cookie",
};
let crumb;

describe("Assurance Scheme", () => {
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
    jest.resetAllMocks();
    await server.stop();
  });

  describe(`GET ${url} route`, () => {
    test("redirect if not logged in / authorized", async () => {
      const options = {
        method: "GET",
        url,
      };

      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
        .mockReturnValue({ typeOfLivestock: "pigs" });

      const response = await server.inject(options);

      expect(response.statusCode).toBe(302);
      expect(response.headers.location.toString()).toEqual(`/sign-in`);
    });

    test("Returns 200", async () => {
      const options = {
        method: "GET",
        url,
        auth,
      };

      const response = await server.inject(options);

      expect(await axe(response.payload)).toHaveNoViolations();
      expect(response.statusCode).toBe(200);
    });
  });

  describe(`POST ${url}`, () => {
    test("show inline Error if continue is pressed and assurance answer not selected", async () => {
      const options = {
        method: "POST",
        auth,
        url,
        headers: { cookie: `crumb=${crumb}` },
        payload: { crumb, assurance: "" },
      };

      getSessionData.mockReturnValue({ typeOfLivestock: "broilers" });

      const response = await server.inject(options);

      expect(await axe(response.payload)).toHaveNoViolations();
      const $ = cheerio.load(response.payload);
      const errorMessage = '"assurance" must be one of [yes, no]';

      expect($("li > a").text()).toMatch(errorMessage);
    });

    test('continue to next page when assurance is "yes"', async () => {
      const options = {
        method: "POST",
        auth,
        url,
        headers: { cookie: `crumb=${crumb}` },
        payload: { crumb, assurance: "yes" },
      };

      getSessionData.mockReturnValue({ typeOfLivestock: "broilers" });

      const response = await server.inject(options);

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toEqual(`/species-numbers`);
      expect(setSessionData).toHaveBeenCalled();
    });

    test('continue to next page when assurance is "no"', async () => {
      const options = {
        method: "POST",
        auth,
        url,
        headers: { cookie: `crumb=${crumb}` },
        payload: { crumb, assurance: "no" },
      };

      getSessionData.mockReturnValue({ typeOfLivestock: "broilers" });

      const response = await server.inject(options);

      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toEqual(`/species-numbers`);
      expect(setSessionData).toHaveBeenCalled();
    });
  });
});

import * as cheerio from "cheerio";
import { createServer } from "../../../../../../app/server.js";
import { getCrumbs } from "../../../../../utils/get-crumbs.js";
import {
  getSessionData,
  sessionEntryKeys,
  sessionKeys,
  setSessionData,
} from "../../../../../../app/session/index.js";
import { sendInvalidDataPoultryEvent } from "../../../../../../app/messaging/ineligibility-event-emission.js";
import { when } from "jest-when";
import { axe } from "../../../../../helpers/axe-helper.js";
import { config } from "../../../../../../app/config/index.js";

jest.mock("../../../../../../app/messaging/ineligibility-event-emission.js");
jest.mock("../../../../../../app/session/index.js");
jest.mock("../../../../../../app/lib/context-helper.js");

const url = `/poultry/biosecurity`;
const auth = {
  credentials: { reference: "1111", sbi: "111111111" },
  strategy: "cookie",
};
let crumb;

describe("/poultry/biosecurity", () => {
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
        "Did the vet do a biosecurity assessment? - Get funding to improve animal health and welfare",
      );
      expect($("h1").text()).toMatch("Did the vet do a biosecurity assessment?");
    });

    test("selects 'yes' when previously selected", async () => {
      const options = {
        method: "GET",
        auth,
        url,
      };

      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          biosecurity: "yes",
        });

      const response = await server.inject(options);

      expect(await axe(response.payload)).toHaveNoViolations();
      const $ = cheerio.load(response.payload);

      expect($('input[name="biosecurity"]:checked').val()).toEqual("yes");
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
          biosecurity: "no",
        });

      const response = await server.inject(options);

      expect(await axe(response.payload)).toHaveNoViolations();
      const $ = cheerio.load(response.payload);

      expect($('input[name="biosecurity"]:checked').val()).toEqual("no");
    });

    describe(`POST ${url}`, () => {
      test("show error when biosecurity answer not selected", async () => {
        const options = {
          method: "POST",
          auth,
          url,
          headers: { cookie: `crumb=${crumb}` },
          payload: { crumb, biosecurity: "", assessmentPercentage: "" },
        };

        const response = await server.inject(options);

        expect(await axe(response.payload)).toHaveNoViolations();
        const $ = cheerio.load(response.payload);
        const errorMessage = "Select yes if the vet did a biosecurity assessment";

        expect($("li > a").text()).toMatch(errorMessage);
      });

      test('continue to next page when biosecurity is "yes"', async () => {
        const options = {
          method: "POST",
          auth,
          url,
          headers: { cookie: `crumb=${crumb}` },
          payload: { crumb, biosecurity: "yes" },
        };

        const response = await server.inject(options);

        expect(response.statusCode).toBe(302);
        expect(response.headers.location).toEqual(`/poultry/biosecurity-usefulness`);
        expect(setSessionData).toHaveBeenCalledWith(
          expect.any(Object),
          "poultryClaim",
          "biosecurity",
          "yes",
        );
      });

      test('displays exception page when biosecurity is "no"', async () => {
        const options = {
          method: "POST",
          auth,
          url,
          headers: { cookie: `crumb=${crumb}` },
          payload: { crumb, biosecurity: "no" },
        };

        const response = await server.inject(options);

        expect(await axe(response.payload)).toHaveNoViolations();
        const $ = cheerio.load(response.payload);

        expect(response.statusCode).toBe(400);
        expect($("h1").text()).toMatch("You cannot continue with your claim");
        expect(setSessionData).toHaveBeenCalledWith(
          expect.any(Object),
          "poultryClaim",
          "biosecurity",
          "no",
        );

        expect(sendInvalidDataPoultryEvent).toHaveBeenCalledWith({
          request: expect.any(Object),
          sessionKey: "biosecurity",
          exception: "Value no is not equal to required value yes",
        });
      });
    });
  });
});

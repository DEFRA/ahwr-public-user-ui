import * as cheerio from "cheerio";
import { when } from "jest-when";
import { createServer } from "../../../../../../app/server.js";
import {
  getSessionData,
  sessionEntryKeys,
  sessionKeys,
  setSessionData,
} from "../../../../../../app/session/index.js";
import { getCrumbs } from "../../../../../utils/get-crumbs.js";
import { config } from "../../../../../../app/config/index.js";

const auth = { credentials: { reference: "1111", sbi: "111111111" }, strategy: "cookie" };
const url = "/poultry/select-poultry-type";

jest.mock("../../../../../../app/session/index.js");

describe("/poultry/select-poultry-type", () => {
  let server;
  let crumb;

  beforeAll(async () => {
    config.poultry.enabled = true;
    setSessionData.mockImplementation(() => {});
    server = await createServer();
    await server.initialize();
  });

  afterAll(async () => {
    await server.stop();
  });

  beforeEach(() => {
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

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe("POST", () => {
    beforeAll(async () => {
      crumb = await getCrumbs(server);
    });

    test("saves chicken sub-types and other poultry types to session (filters out 'chickens')", async () => {
      getSessionData.mockReturnValue({
        reference: "TEMP-6GSE-PIR8",
      });

      const res = await server.inject({
        method: "POST",
        url,
        auth,
        payload: {
          crumb,
          typesOfPoultry: [
            "chickens",
            "broilers",
            "laying-hens",
            "breeders",
            "ducks",
            "turkeys",
            "geese",
          ],
        },
        headers: { cookie: `crumb=${crumb}` },
      });

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toEqual("/poultry/minimum-number-of-animals");
      expect(setSessionData).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.typesOfPoultry,
        "broilers, laying-hens, breeders, ducks, turkeys, geese",
      );
    });

    test("saves only broilers when only broilers is selected under chickens", async () => {
      getSessionData.mockReturnValue({
        reference: "TEMP-6GSE-PIR8",
      });

      const res = await server.inject({
        method: "POST",
        url,
        auth,
        payload: {
          crumb,
          typesOfPoultry: ["chickens", "broilers"],
        },
        headers: { cookie: `crumb=${crumb}` },
      });

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toEqual("/poultry/minimum-number-of-animals");
      expect(setSessionData).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.typesOfPoultry,
        "broilers",
      );
    });

    test("returns 400 and shows error when only chickens is selected without sub-types", async () => {
      getSessionData.mockReturnValue({
        reference: "TEMP-6GSE-PIR8",
      });

      const res = await server.inject({
        method: "POST",
        url,
        auth,
        payload: {
          crumb,
          typesOfPoultry: "chickens",
        },
        headers: { cookie: `crumb=${crumb}` },
      });

      expect(res.statusCode).toBe(400);
      const $ = cheerio.load(res.payload);
      expect($(".govuk-error-summary__list").text()).toContain(
        "Select which type of chickens you keep",
      );
      expect(setSessionData).not.toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.typesOfPoultry,
        expect.anything(),
      );
    });

    test("returns 400 and shows error when no poultry type is selected", async () => {
      getSessionData.mockReturnValue({
        reference: "TEMP-6GSE-PIR8",
      });

      const res = await server.inject({
        method: "POST",
        url,
        auth,
        payload: {
          crumb,
        },
        headers: { cookie: `crumb=${crumb}` },
      });

      expect(res.statusCode).toBe(400);
      const $ = cheerio.load(res.payload);
      expect($(".govuk-error-summary__list").text()).toContain("Select at least one option");
      expect(setSessionData).not.toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.typesOfPoultry,
        expect.anything(),
      );
    });
  });
});

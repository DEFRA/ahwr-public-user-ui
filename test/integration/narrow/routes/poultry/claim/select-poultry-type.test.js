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
import { axe } from "../../../../../helpers/axe-helper.js";

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
      .mockReturnValue({ reference: "TEMP-6GSE-PIR8", status: "AGREED" });

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

  describe("GET", () => {
    test("when not logged in redirects to /sign-in", async () => {
      const options = {
        method: "GET",
        url,
      };

      const res = await server.inject(options);

      expect(res.statusCode).toBe(302);
      expect(res.headers.location.toString()).toEqual(`/sign-in`);
    });

    test("shows information", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({ typesOfPoultry: [] });

      const res = await server.inject({
        method: "GET",
        url,
        auth,
      });

      expect(res.statusCode).toBe(200);
      expect(await axe(res.payload)).toHaveNoViolations();
      const $ = cheerio.load(res.payload);
      expect($("#back").attr("href")).toEqual("/poultry/site-others-on-sbi");
    });

    test("shows the updated heading", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({ typesOfPoultry: [] });

      const res = await server.inject({
        method: "GET",
        url,
        auth,
      });

      const $ = cheerio.load(res.payload);
      expect($("h1").text().trim()).toEqual("Which types of poultry do you keep on this site?");
    });

    test("shows the updated hint", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({ typesOfPoultry: [] });

      const res = await server.inject({
        method: "GET",
        url,
        auth,
      });

      const $ = cheerio.load(res.payload);
      expect($(".govuk-hint").text().trim()).toEqual("Select all poultry kept on this site");
    });

    test("shows chicken sub-types in alphabetical order with the pullets label", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({ typesOfPoultry: ["chickens", "laying-hens"] });

      const res = await server.inject({
        method: "GET",
        url,
        auth,
      });

      const $ = cheerio.load(res.payload);
      const subTypeLabels = $(".govuk-checkboxes__conditional .govuk-checkboxes__label")
        .map((_, el) => $(el).text().trim())
        .get();
      expect(subTypeLabels).toEqual(["Breeders", "Broilers", "Laying hens (including pullets)"]);
    });

    test("shows back link to select-the-site when no herds exist", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({ typesOfPoultry: [], herds: [] });

      const res = await server.inject({
        method: "GET",
        url,
        auth,
      });

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      expect($("#back").attr("href")).toEqual("/poultry/site-others-on-sbi");
    });

    test("shows back link to select-the-site when herds exist", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({ typesOfPoultry: [], herds: [{ id: "1" }] });

      const res = await server.inject({
        method: "GET",
        url,
        auth,
      });

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      expect($("#back").attr("href")).toEqual("/poultry/select-the-site");
    });

    test("handles undefined typesOfPoultry in session", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({});

      const res = await server.inject({
        method: "GET",
        url,
        auth,
      });

      expect(res.statusCode).toBe(200);
    });
  });

  describe("POST", () => {
    beforeAll(async () => {
      crumb = await getCrumbs(server);
    });

    test("saves chicken sub-types and other poultry types to session", async () => {
      getSessionData.mockReturnValue({
        reference: "TEMP-6GSE-PIR8",
      });

      const res = await server.inject({
        method: "POST",
        url,
        auth,
        payload: {
          crumb,
          typesOfPoultry: ["chickens", "ducks", "turkeys", "geese"],
          typesOfChicken: ["broilers", "laying-hens", "breeders"],
        },
        headers: { cookie: `crumb=${crumb}` },
      });

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toEqual("/poultry/minimum-number-of-birds");
      expect(setSessionData).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.typesOfPoultry,
        ["chickens", "ducks", "turkeys", "geese", "broilers", "laying-hens", "breeders"],
      );
    });

    test("saves broilers when only broilers is selected under chickens", async () => {
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
          typesOfChicken: "broilers",
        },
        headers: { cookie: `crumb=${crumb}` },
      });

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toEqual("/poultry/minimum-number-of-birds");
      expect(setSessionData).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.typesOfPoultry,
        ["chickens", "broilers"],
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
        "Select at least one type of chicken",
      );
      expect($("#typesOfChicken-error").text()).toContain("Select at least one type of chicken");
      expect(setSessionData).not.toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.typesOfPoultry,
        expect.anything(),
      );
    });

    test("returns 400 and shows error when chickens is selected without sub-types and some other poultry", async () => {
      getSessionData.mockReturnValue({
        reference: "TEMP-6GSE-PIR8",
      });

      const res = await server.inject({
        method: "POST",
        url,
        auth,
        payload: {
          crumb,
          typesOfPoultry: ["chickens", "ducks"],
        },
        headers: { cookie: `crumb=${crumb}` },
      });

      expect(res.statusCode).toBe(400);
      const $ = cheerio.load(res.payload);
      expect($(".govuk-error-summary__list").text()).toContain(
        "Select at least one type of chicken",
      );
      expect($("#typesOfChicken-error").text()).toContain("Select at least one type of chicken");
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
      expect($(".govuk-error-summary__list").text()).toContain(
        "Select at least one type of poultry",
      );
      expect($("#typesOfPoultry-error").text()).toContain("Select at least one type of poultry");
      expect(setSessionData).not.toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.typesOfPoultry,
        expect.anything(),
      );
    });
  });
});

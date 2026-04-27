import * as cheerio from "cheerio";
import { when } from "jest-when";
import { createServer } from "../../../../../../app/server.js";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../../../../../app/session/index.js";
import { config } from "../../../../../../app/config/index.js";
import { getCrumbs } from "../../../../../utils/get-crumbs.js";
import { axe } from "../../../../../helpers/axe-helper.js";

const auth = { credentials: { reference: "1111", sbi: "111111111" }, strategy: "cookie" };
const url = "/poultry/select-the-site";

jest.mock("../../../../../../app/session/index.js");

describe("/poultry/select-the-site", () => {
  let server;

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

  describe("GET", () => {
    test("returns 200 and displays page correctly with single previous site", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          siteSelected: null,
          previousClaims: [
            {
              herd: {
                id: "herd-123",
                name: "Main Farm",
                cph: "12/345/6789",
              },
              data: {
                typesOfPoultry: "Layers",
                dateOfVisit: "2024-03-15",
              },
              createdAt: "2024-03-20",
            },
          ],
        });

      const res = await server.inject({ method: "GET", url, auth });

      expect(res.statusCode).toBe(200);
      expect(await axe(res.payload)).toHaveNoViolations();
      const $ = cheerio.load(res.payload);
      expect($(".govuk-back-link").attr("href")).toContain("/poultry/date-of-visit");
      expect($("title").text()).toContain("Is this the same site you have previously claimed for?");
    });

    test("displays species, last visit date, and claim date for single site", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          siteSelected: null,
          previousClaims: [
            {
              herd: {
                id: "herd-123",
                name: "Main Farm",
                cph: "12/345/6789",
              },
              data: {
                typesOfPoultry: "Layers",
                dateOfVisit: "2024-03-15",
              },
              createdAt: "2024-03-20",
            },
          ],
        });

      const res = await server.inject({ method: "GET", url, auth });

      expect(res.statusCode).toBe(200);
      expect(res.payload).toContain("Main Farm");
      expect(res.payload).toContain("12/345/6789");
      expect(res.payload).toContain("Layers");
      expect(res.payload).toContain("15 March 2024");
      expect(res.payload).toContain("20 March 2024");
    });

    test("returns 200 and displays page correctly with multiple previous sites", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          siteSelected: null,
          previousClaims: [
            {
              herd: {
                id: "herd-123",
                name: "Main Farm",
                cph: "12/345/6789",
              },
              data: {
                typesOfPoultry: "Layers",
                dateOfVisit: "2024-03-15",
              },
              createdAt: "2024-03-20",
            },
            {
              herd: {
                id: "herd-456",
                name: "Second Farm",
                cph: "98/765/4321",
              },
              data: {
                typesOfPoultry: "Broilers",
                dateOfVisit: "2024-02-10",
              },
              createdAt: "2024-02-15",
            },
          ],
        });

      const res = await server.inject({ method: "GET", url, auth });

      expect(res.statusCode).toBe(200);
      expect(await axe(res.payload)).toHaveNoViolations();
      const $ = cheerio.load(res.payload);
      expect($(".govuk-back-link").attr("href")).toContain("/poultry/date-of-visit");
      expect($("title").text()).toContain("Select the site you are claiming for");
    });

    test("displays CPH prefix in radio button hints for multiple sites", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          siteSelected: null,
          previousClaims: [
            {
              herd: {
                id: "herd-123",
                name: "Main Farm",
                cph: "12/345/6789",
              },
              data: {
                typesOfPoultry: "Layers",
                dateOfVisit: "2024-03-15",
              },
              createdAt: "2024-03-20",
            },
            {
              herd: {
                id: "herd-456",
                name: "Second Farm",
                cph: "98/765/4321",
              },
              data: {
                typesOfPoultry: "Broilers",
                dateOfVisit: "2024-02-10",
              },
              createdAt: "2024-02-15",
            },
          ],
        });

      const res = await server.inject({ method: "GET", url, auth });

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      const hints = $(".govuk-radios__hint");
      expect(hints.first().text()).toContain("CPH: 12/345/6789");
      expect(hints.eq(1).text()).toContain("CPH: 98/765/4321");
    });

    test("returns 200 with empty sites when no previous claims", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          siteSelected: null,
          previousClaims: [],
        });

      const res = await server.inject({ method: "GET", url, auth });

      expect(res.statusCode).toBe(200);
    });

    test("returns 200 with empty sites when previousClaims is undefined", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          siteSelected: null,
          previousClaims: undefined,
        });

      const res = await server.inject({ method: "GET", url, auth });

      expect(res.statusCode).toBe(200);
    });

    test("filters out claims without herd name", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          siteSelected: null,
          previousClaims: [
            {
              herd: {
                id: "herd-123",
                name: "Main Farm",
                cph: "12/345/6789",
              },
              data: {
                typesOfPoultry: "Layers",
                dateOfVisit: "2024-03-15",
              },
              createdAt: "2024-03-20",
            },
            {
              herd: {
                id: "herd-456",
                cph: "98/765/4321",
              },
              data: {
                typesOfPoultry: "Broilers",
              },
            },
          ],
        });

      const res = await server.inject({ method: "GET", url, auth });

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      expect($("title").text()).toContain("Is this the same site you have previously claimed for?");
    });

    test("filters out claims without herd cph", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          siteSelected: null,
          previousClaims: [
            {
              herd: {
                id: "herd-123",
                name: "Main Farm",
                cph: "12/345/6789",
              },
              data: {
                typesOfPoultry: "Layers",
                dateOfVisit: "2024-03-15",
              },
              createdAt: "2024-03-20",
            },
            {
              herd: {
                id: "herd-456",
                name: "Second Farm",
              },
              data: {
                typesOfPoultry: "Broilers",
              },
            },
          ],
        });

      const res = await server.inject({ method: "GET", url, auth });

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      expect($("title").text()).toContain("Is this the same site you have previously claimed for?");
    });

    test("returns unique sites when duplicate name/cph combinations exist", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          siteSelected: null,
          previousClaims: [
            {
              herd: {
                id: "herd-123",
                name: "Main Farm",
                cph: "12/345/6789",
              },
              data: {
                typesOfPoultry: "Layers",
                dateOfVisit: "2024-03-15",
              },
              createdAt: "2024-03-20",
            },
            {
              herd: {
                id: "herd-456",
                name: "Main Farm",
                cph: "12/345/6789",
              },
              data: {
                typesOfPoultry: "Layers",
                dateOfVisit: "2024-01-10",
              },
              createdAt: "2024-01-15",
            },
            {
              herd: {
                id: "herd-789",
                name: "Second Farm",
                cph: "98/765/4321",
              },
              data: {
                typesOfPoultry: "Broilers",
                dateOfVisit: "2024-02-10",
              },
              createdAt: "2024-02-15",
            },
          ],
        });

      const res = await server.inject({ method: "GET", url, auth });

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      expect($("title").text()).toContain("Select the site you are claiming for");
    });

    test("filters out claims without herd object", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          siteSelected: null,
          previousClaims: [
            {
              herd: {
                id: "herd-123",
                name: "Main Farm",
                cph: "12/345/6789",
              },
              data: {
                typesOfPoultry: "Layers",
                dateOfVisit: "2024-03-15",
              },
              createdAt: "2024-03-20",
            },
            {
              data: { typesOfPoultry: "Broilers" },
            },
          ],
        });

      const res = await server.inject({ method: "GET", url, auth });

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      expect($("title").text()).toContain("Is this the same site you have previously claimed for?");
    });

    test("preserves previously selected site", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          siteSelected: "herd-123",
          previousClaims: [
            {
              herd: {
                id: "herd-123",
                name: "Main Farm",
                cph: "12/345/6789",
              },
              data: {
                typesOfPoultry: "Layers",
                dateOfVisit: "2024-03-15",
              },
              createdAt: "2024-03-20",
            },
          ],
        });

      const res = await server.inject({ method: "GET", url, auth });

      expect(res.statusCode).toBe(200);
    });

    test("handles claims with missing data fields gracefully", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          siteSelected: null,
          previousClaims: [
            {
              herd: {
                id: "herd-123",
                name: "Main Farm",
                cph: "12/345/6789",
              },
            },
          ],
        });

      const res = await server.inject({ method: "GET", url, auth });

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      expect($("title").text()).toContain("Is this the same site you have previously claimed for?");
      expect(res.payload).toContain("Main Farm");
      expect(res.payload).toContain("12/345/6789");
    });
  });

  describe("POST", () => {
    let crumb;

    beforeAll(async () => {
      crumb = await getCrumbs(server);
    });

    test("redirects to enter-site-name when selecting new site from single site view", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          siteSelected: null,
          previousClaims: [
            {
              herd: {
                id: "herd-123",
                name: "Main Farm",
                cph: "12/345/6789",
              },
              data: {
                typesOfPoultry: "Layers",
                dateOfVisit: "2024-03-15",
              },
              createdAt: "2024-03-20",
            },
          ],
        });

      const res = await server.inject({
        method: "POST",
        url,
        auth,
        payload: { crumb, siteSelected: "NEW_SITE" },
        headers: { cookie: `crumb=${crumb}` },
      });

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toEqual("/poultry/enter-site-name");

      expect(setSessionData).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.siteSelected,
        "NEW_SITE",
        { shouldEmitEvent: false },
      );
      expect(setSessionData).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.herdId,
        null,
        { shouldEmitEvent: false },
      );
      expect(setSessionData).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.herdName,
        null,
        { shouldEmitEvent: false },
      );
      expect(setSessionData).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.herdCph,
        null,
        { shouldEmitEvent: false },
      );
      expect(setSessionData).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.herdSame,
        "no",
        { shouldEmitEvent: false },
      );
    });

    test("redirects to enter-site-name when selecting new site from multiple sites view", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          siteSelected: null,
          previousClaims: [
            {
              herd: {
                id: "herd-123",
                name: "Main Farm",
                cph: "12/345/6789",
              },
              data: {
                typesOfPoultry: "Layers",
                dateOfVisit: "2024-03-15",
              },
              createdAt: "2024-03-20",
            },
            {
              herd: {
                id: "herd-456",
                name: "Second Farm",
                cph: "98/765/4321",
              },
              data: {
                typesOfPoultry: "Broilers",
                dateOfVisit: "2024-02-10",
              },
              createdAt: "2024-02-15",
            },
          ],
        });

      const res = await server.inject({
        method: "POST",
        url,
        auth,
        payload: { crumb, siteSelected: "NEW_SITE" },
        headers: { cookie: `crumb=${crumb}` },
      });

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toEqual("/poultry/enter-site-name");
      expect(setSessionData).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.siteSelected,
        "NEW_SITE",
        { shouldEmitEvent: false },
      );
      expect(setSessionData).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.herdId,
        null,
        { shouldEmitEvent: false },
      );
      expect(setSessionData).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.herdName,
        null,
        { shouldEmitEvent: false },
      );
      expect(setSessionData).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.herdCph,
        null,
        { shouldEmitEvent: false },
      );
      expect(setSessionData).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.herdSame,
        "no",
        { shouldEmitEvent: false },
      );
    });

    test("returns 400 and shows error when no site is selected from single site view", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          siteSelected: null,
          previousClaims: [
            {
              herd: {
                id: "herd-123",
                name: "Main Farm",
                cph: "12/345/6789",
              },
              data: {
                typesOfPoultry: "Layers",
                dateOfVisit: "2024-03-15",
              },
              createdAt: "2024-03-20",
            },
          ],
        });

      const res = await server.inject({
        method: "POST",
        url,
        auth,
        payload: { crumb },
        headers: { cookie: `crumb=${crumb}` },
      });

      expect(res.statusCode).toBe(400);
      const $ = cheerio.load(res.payload);
      expect($(".govuk-error-summary__list").text()).toContain(
        "Select the site you are claiming for",
      );
      expect($("#siteSelected-error").text()).toContain("Select the site you are claiming for");
    });

    test("returns 400 and shows error when no site is selected from multiple sites view", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          siteSelected: null,
          previousClaims: [
            {
              herd: {
                id: "herd-123",
                name: "Main Farm",
                cph: "12/345/6789",
              },
              data: {
                typesOfPoultry: "Layers",
                dateOfVisit: "2024-03-15",
              },
              createdAt: "2024-03-20",
            },
            {
              herd: {
                id: "herd-456",
                name: "Second Farm",
                cph: "98/765/4321",
              },
              data: {
                typesOfPoultry: "Broilers",
                dateOfVisit: "2024-02-10",
              },
              createdAt: "2024-02-15",
            },
          ],
        });

      const res = await server.inject({
        method: "POST",
        url,
        auth,
        payload: { crumb },
        headers: { cookie: `crumb=${crumb}` },
      });

      expect(res.statusCode).toBe(400);
      const $ = cheerio.load(res.payload);
      expect($(".govuk-error-summary__list").text()).toContain(
        "Select the site you are claiming for",
      );
      expect($("#siteSelected-error").text()).toContain("Select the site you are claiming for");
    });

    test("stores site data and redirects to select-poultry-type when existing site is selected from single site view", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          siteSelected: null,
          previousClaims: [
            {
              herd: {
                id: "herd-123",
                name: "Main Farm",
                cph: "12/345/6789",
              },
              data: {
                typesOfPoultry: "Layers",
                dateOfVisit: "2024-03-15",
              },
              createdAt: "2024-03-20",
            },
          ],
        });

      const res = await server.inject({
        method: "POST",
        url,
        auth,
        payload: { crumb, siteSelected: "herd-123" },
        headers: { cookie: `crumb=${crumb}` },
      });

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toEqual("/poultry/select-poultry-type");
      expect(setSessionData).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.siteSelected,
        "herd-123",
        { shouldEmitEvent: false },
      );
      expect(setSessionData).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.herdId,
        "herd-123",
        { shouldEmitEvent: false },
      );
      expect(setSessionData).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.herdName,
        "Main Farm",
        { shouldEmitEvent: false },
      );
      expect(setSessionData).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.herdCph,
        "12/345/6789",
        { shouldEmitEvent: false },
      );
      expect(setSessionData).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.herdSame,
        "yes",
        { shouldEmitEvent: false },
      );
      expect(setSessionData).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.isOnlyHerdOnSbi,
        "no",
        { shouldEmitEvent: false },
      );
    });

    test("stores site data and redirects to select-poultry-type when existing site is selected from multiple sites view", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          siteSelected: null,
          previousClaims: [
            {
              herd: {
                id: "herd-123",
                name: "Main Farm",
                cph: "12/345/6789",
              },
              data: {
                typesOfPoultry: "Layers",
                dateOfVisit: "2024-03-15",
              },
              createdAt: "2024-03-20",
            },
            {
              herd: {
                id: "herd-456",
                name: "Second Farm",
                cph: "98/765/4321",
              },
              data: {
                typesOfPoultry: "Broilers",
                dateOfVisit: "2024-02-10",
              },
              createdAt: "2024-02-15",
            },
          ],
        });

      const res = await server.inject({
        method: "POST",
        url,
        auth,
        payload: { crumb, siteSelected: "herd-456" },
        headers: { cookie: `crumb=${crumb}` },
      });

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toEqual("/poultry/select-poultry-type");
      expect(setSessionData).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.siteSelected,
        "herd-456",
        { shouldEmitEvent: false },
      );
      expect(setSessionData).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.herdId,
        "herd-456",
        { shouldEmitEvent: false },
      );
      expect(setSessionData).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.herdName,
        "Second Farm",
        { shouldEmitEvent: false },
      );
      expect(setSessionData).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.herdCph,
        "98/765/4321",
        { shouldEmitEvent: false },
      );
      expect(setSessionData).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.herdSame,
        "yes",
        { shouldEmitEvent: false },
      );
      expect(setSessionData).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.isOnlyHerdOnSbi,
        "no",
        { shouldEmitEvent: false },
      );
    });

    test("shows timing rules exception when dateOfVisit is within 10 months of previous claim for same site", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          siteSelected: null,
          dateOfVisit: new Date("2025-10-31"),
          previousClaims: [
            {
              herd: {
                id: "herd-123",
                name: "Main Farm",
                cph: "12/345/6789",
              },
              data: {
                typesOfPoultry: "Layers",
                dateOfVisit: "2025-01-01",
              },
              createdAt: "2025-01-05",
            },
          ],
        });

      const res = await server.inject({
        method: "POST",
        url,
        auth,
        payload: { crumb, siteSelected: "herd-123" },
        headers: { cookie: `crumb=${crumb}` },
      });

      expect(res.statusCode).toBe(400);
      const $ = cheerio.load(res.payload);
      expect($("h1").text()).toContain("You cannot continue with your claim");
      expect($(".govuk-back-link").attr("href")).toEqual("/poultry/select-the-site");
    });

    test("allows claim when dateOfVisit is exactly 10 months after previous claim for same site", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          siteSelected: null,
          dateOfVisit: new Date("2025-11-01"),
          previousClaims: [
            {
              herd: {
                id: "herd-123",
                name: "Main Farm",
                cph: "12/345/6789",
              },
              data: {
                typesOfPoultry: "Layers",
                dateOfVisit: "2025-01-01",
              },
              createdAt: "2025-01-05",
            },
          ],
        });

      const res = await server.inject({
        method: "POST",
        url,
        auth,
        payload: { crumb, siteSelected: "herd-123" },
        headers: { cookie: `crumb=${crumb}` },
      });

      expect(res.statusCode).toBe(400);
      const $ = cheerio.load(res.payload);
      expect($("h1").text()).toContain("You cannot continue with your claim");
      expect($(".govuk-back-link").attr("href")).toEqual("/poultry/select-the-site");
    });

    test("allows claim when dateOfVisit is more than 10 months after previous claim for same site", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          siteSelected: null,
          dateOfVisit: new Date("2025-12-01"),
          previousClaims: [
            {
              herd: {
                id: "herd-123",
                name: "Main Farm",
                cph: "12/345/6789",
              },
              data: {
                typesOfPoultry: "Layers",
                dateOfVisit: "2025-01-01",
              },
              createdAt: "2025-01-05",
            },
          ],
        });

      const res = await server.inject({
        method: "POST",
        url,
        auth,
        payload: { crumb, siteSelected: "herd-123" },
        headers: { cookie: `crumb=${crumb}` },
      });

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toEqual("/poultry/select-poultry-type");
    });

    test("does not apply timing rule when selecting a different site", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          siteSelected: null,
          dateOfVisit: new Date("2025-10-31"),
          previousClaims: [
            {
              herd: {
                id: "herd-123",
                name: "Main Farm",
                cph: "12/345/6789",
              },
              data: {
                typesOfPoultry: "Layers",
                dateOfVisit: "2025-01-01",
              },
              createdAt: "2025-01-05",
            },
            {
              herd: {
                id: "herd-456",
                name: "Second Farm",
                cph: "98/765/4321",
              },
              data: {
                typesOfPoultry: "Broilers",
                dateOfVisit: "2024-01-01",
              },
              createdAt: "2024-01-05",
            },
          ],
        });

      const res = await server.inject({
        method: "POST",
        url,
        auth,
        payload: { crumb, siteSelected: "herd-456" },
        headers: { cookie: `crumb=${crumb}` },
      });

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toEqual("/poultry/select-poultry-type");
    });
  });
});

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
import { sendInvalidDataPoultryEvent } from "../../../../../../app/messaging/ineligibility-event-emission.js";

const auth = { credentials: { reference: "1111", sbi: "111111111" }, strategy: "cookie" };
const url = "/poultry/select-site";

jest.mock("../../../../../../app/session/index.js");
jest.mock("../../../../../../app/messaging/ineligibility-event-emission.js");

describe("/poultry/select-site", () => {
  let server;

  beforeAll(async () => {
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

    when(getSessionData)
      .calledWith(
        expect.anything(),
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.reference,
      )
      .mockReturnValue("POUL-1LZ5-ELVQ");
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
                typesOfPoultry: ["laying-hens"],
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
      expect($("title").text()).toContain("Your previous claim");
      expect($("h1").text()).toContain("Your previous claim");
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
                typesOfPoultry: ["laying-hens"],
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
      expect(res.payload).toContain("Laying hens");
      expect(res.payload).toContain("15 March 2024");
      expect(res.payload).toContain("20 March 2024");
    });

    test("labels the previous claim summary with 'Types of poultry' for a single site", async () => {
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
                typesOfPoultry: ["laying-hens"],
                dateOfVisit: "2024-03-15",
              },
              createdAt: "2024-03-20",
            },
          ],
        });

      const res = await server.inject({ method: "GET", url, auth });

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      expect($(".govuk-summary-list__key").first().text()).toContain("Types of poultry");
      expect(res.payload).not.toContain("Your last claim for this species:");
    });

    test("asks whether claiming for the same site with the reworded question and options", async () => {
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
                typesOfPoultry: ["laying-hens"],
                dateOfVisit: "2024-03-15",
              },
              createdAt: "2024-03-20",
            },
          ],
        });

      const res = await server.inject({ method: "GET", url, auth });

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      expect($(".govuk-fieldset__legend").text()).toContain(
        "Are you making another claim for the same site?",
      );
      expect(res.payload).toContain("You can have reviews on more than one site.");
      expect(res.payload).not.toContain(
        "You can now have reviews and follow-ups on more than one site.",
      );
      const radioLabels = $(".govuk-radios__label").text();
      expect(radioLabels).toContain("Yes, I'm claiming for the same site");
      expect(radioLabels).toContain("No, I'm claiming for a different site");
    });

    test("formats the types of poultry as a capitalised, comma-separated list excluding chickens", async () => {
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
                typesOfPoultry: ["chickens", "broilers", "laying-hens", "ducks"],
                dateOfVisit: "2024-03-15",
              },
              createdAt: "2024-03-20",
            },
          ],
        });

      const res = await server.inject({ method: "GET", url, auth });

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      expect($(".govuk-summary-list__value").first().text()).toContain(
        "Broilers, laying hens, ducks",
      );
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
                typesOfPoultry: ["laying-hens"],
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
                typesOfPoultry: ["broilers"],
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
                typesOfPoultry: ["laying-hens"],
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
                typesOfPoultry: ["broilers"],
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
                typesOfPoultry: ["laying-hens"],
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
                typesOfPoultry: ["broilers"],
              },
            },
          ],
        });

      const res = await server.inject({ method: "GET", url, auth });

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      expect($("title").text()).toContain("Your previous claim");
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
                typesOfPoultry: ["laying-hens"],
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
                typesOfPoultry: ["broilers"],
              },
            },
          ],
        });

      const res = await server.inject({ method: "GET", url, auth });

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      expect($("title").text()).toContain("Your previous claim");
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
                typesOfPoultry: ["laying-hens"],
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
                typesOfPoultry: ["laying-hens"],
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
                typesOfPoultry: ["broilers"],
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
                typesOfPoultry: ["laying-hens"],
                dateOfVisit: "2024-03-15",
              },
              createdAt: "2024-03-20",
            },
            {
              data: { typesOfPoultry: ["broilers"] },
            },
          ],
        });

      const res = await server.inject({ method: "GET", url, auth });

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      expect($("title").text()).toContain("Your previous claim");
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
                typesOfPoultry: ["laying-hens"],
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
      expect($("title").text()).toContain("Your previous claim");
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
          tempHerdId: "4e2f6b81-a9c3-4074-b51d-d9e2a8f7c6b5",
          previousClaims: [
            {
              herd: {
                id: "herd-123",
                name: "Main Farm",
                cph: "12/345/6789",
              },
              data: {
                typesOfPoultry: ["laying-hens"],
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
        "4e2f6b81-a9c3-4074-b51d-d9e2a8f7c6b5",
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
          tempHerdId: "4e2f6b81-a9c3-4074-b51d-d9e2a8f7c6b5",
          previousClaims: [
            {
              herd: {
                id: "herd-123",
                name: "Main Farm",
                cph: "12/345/6789",
              },
              data: {
                typesOfPoultry: ["laying-hens"],
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
                typesOfPoultry: ["broilers"],
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
        "4e2f6b81-a9c3-4074-b51d-d9e2a8f7c6b5",
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
                typesOfPoultry: ["laying-hens"],
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
                typesOfPoultry: ["laying-hens"],
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
                typesOfPoultry: ["broilers"],
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
                typesOfPoultry: ["laying-hens"],
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
                typesOfPoultry: ["laying-hens"],
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
                typesOfPoultry: ["broilers"],
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
      const dateOfVisit = new Date("2025-10-31");
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          siteSelected: null,
          dateOfVisit,
          previousClaims: [
            {
              herd: {
                id: "herd-123",
                name: "Main Farm",
                cph: "12/345/6789",
              },
              data: {
                typesOfPoultry: ["laying-hens"],
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
      expect($(".govuk-back-link").attr("href")).toEqual("/poultry/select-site");
      expect(sendInvalidDataPoultryEvent).toHaveBeenCalledWith({
        request: expect.anything(),
        sessionKey: sessionKeys.poultryClaim.dateOfVisit,
        exception: `Value ${dateOfVisit} is invalid. Error: There must be at least 10 months between your reviews.`,
      });
    });

    test("timing rules exception shows the guidance link, change-answer link and warning", async () => {
      const dateOfVisit = new Date("2025-10-31");
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          siteSelected: null,
          dateOfVisit,
          previousClaims: [
            {
              herd: {
                id: "herd-123",
                name: "Main Farm",
                cph: "12/345/6789",
              },
              data: {
                typesOfPoultry: ["laying-hens"],
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
      expect(await axe(res.payload)).toHaveNoViolations();
      const $ = cheerio.load(res.payload);

      const guidanceLink = $("a").filter(
        (_, el) =>
          $(el).text().trim() ===
          "There must be at least 10 months between your poultry biosecurity reviews for this site",
      );
      expect(guidanceLink.attr("href")).toEqual(config.poultry.guidanceUri);

      const changeAnswerLink = $('a[href="/poultry/date-of-visit"]');
      expect(changeAnswerLink.text().trim()).toEqual(
        "Enter the date the vet last visited your farm",
      );

      expect(res.payload).toContain(
        "If you entered the wrong date, you'll need to go back and enter the correct date.",
      );
      expect(res.payload).toContain("Submitted claims will be checked by our team.");
    });

    test("allows claim when dateOfVisit is exactly 10 months after previous claim for same site", async () => {
      const dateOfVisit = new Date("2025-11-01");
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.poultryClaim)
        .mockReturnValue({
          siteSelected: null,
          dateOfVisit,
          previousClaims: [
            {
              herd: {
                id: "herd-123",
                name: "Main Farm",
                cph: "12/345/6789",
              },
              data: {
                typesOfPoultry: ["laying-hens"],
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
      expect($(".govuk-back-link").attr("href")).toEqual("/poultry/select-site");
      expect(sendInvalidDataPoultryEvent).toHaveBeenCalledWith({
        request: expect.anything(),
        sessionKey: sessionKeys.poultryClaim.dateOfVisit,
        exception: `Value ${dateOfVisit} is invalid. Error: There must be at least 10 months between your reviews.`,
      });
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
                typesOfPoultry: ["laying-hens"],
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
                typesOfPoultry: ["laying-hens"],
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
                typesOfPoultry: ["broilers"],
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

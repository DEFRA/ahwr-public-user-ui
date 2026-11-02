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
import { livestockClaimRoutes } from "../../../../../../app/constants/routes.js";

jest.mock("../../../../../../app/session/index.js");
jest.mock("../../../../../../app/api-requests/claim-api");

describe("select-review tests", () => {
  const url = livestockClaimRoutes.selectReview;
  const auth = {
    credentials: { reference: "1111", sbi: "111111111" },
    strategy: "cookie",
  };
  let server;
  let crumb;

  beforeAll(async () => {
    setSessionData.mockImplementation(() => {});
    server = await createServer();
    await server.initialize();
  });

  afterAll(async () => {
    await server.stop();
  });

  beforeEach(async () => {
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

    when(getSessionData)
      .calledWith(
        expect.anything(),
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.reference,
      )
      .mockReturnValue("IAHW-1LZ5-ELVQ");

    crumb = await getCrumbs(server);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe("GET", () => {
    it("should render matching eligible review claims (PAID and READY_TO_PAY) with formatted labels and hints", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
        .mockReturnValue({
          herdName: "Barn Herd",
          typeOfLivestock: "beef",
          dateOfVisit: "2024-05-10",
          herdId: "herd-1",
          previousClaims: [
            {
              reference: "CLAIM-1",
              type: "REVIEW",
              status: "PAID",
              herd: { id: "herd-1", name: "Barn Herd" },
              createdAt: "2024-02-15T12:00:00.000Z",
              data: {
                typeOfLivestock: "beef",
                dateOfVisit: "2024-02-10",
                dateOfTesting: "2024-02-05",
              },
            },
            {
              reference: "CLAIM-2",
              type: "REVIEW",
              status: "READY_TO_PAY",
              herd: { id: "herd-1", name: "Barn Herd" },
              createdAt: "2024-03-15T12:00:00.000Z",
              data: {
                typeOfLivestock: "beef",
                dateOfVisit: "2024-03-10",
                dateOfTesting: "2024-03-05",
              },
            },
          ],
        });

      const res = await server.inject({ method: "GET", url, auth });

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);

      expect($("h1").text().trim()).toContain("Which review is this follow-up related to?");
      expect($(".govuk-back-link").attr("href")).toBe(livestockClaimRoutes.dateOfVisit);

      const fieldsetHint = $("#reviews-hint").html();
      expect(fieldsetHint).toContain("<b>Herd Name</b>: Barn Herd<br><b>Species</b>: beef");

      expect($("input[name='reviews']")).toHaveLength(2);
      expect($("input[value='CLAIM-1']")).toHaveLength(1);
      expect($("input[value='CLAIM-2']")).toHaveLength(1);

      const labels = $(".govuk-radios__label");
      expect(labels.eq(0).html()).toContain("<b>Date of review</b>: 10 February 2024");
      expect(labels.eq(1).html()).toContain("<b>Date of review</b>: 10 March 2024");

      const hints = $(".govuk-radios__hint");
      expect(hints).toHaveLength(2);
      expect(hints.eq(0).html()).toContain("<b>Claim number</b>: CLAIM-1");
      expect(hints.eq(1).html()).toContain("<b>Claim number</b>: CLAIM-2");
    });

    it("should exclude review claims that are not PAID or READY_TO_PAY, different herd, different species, or future dates", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
        .mockReturnValue({
          herdName: "Barn Herd",
          typeOfLivestock: "beef",
          dateOfVisit: "2024-05-10",
          herdId: "herd-1",
          previousClaims: [
            {
              reference: "CLAIM-PAID",
              type: "REVIEW",
              status: "PAID",
              herd: { id: "herd-1", name: "Barn Herd" },
              createdAt: "2024-02-15T12:00:00.000Z",
              data: {
                typeOfLivestock: "beef",
                dateOfVisit: "2024-03-10",
              },
            },
            {
              reference: "CLAIM-IN-CHECK",
              type: "REVIEW",
              status: "IN_CHECK",
              herd: { id: "herd-1", name: "Barn Herd" },
              createdAt: "2024-02-15T12:00:00.000Z",
              data: {
                typeOfLivestock: "beef",
                dateOfVisit: "2024-03-10",
              },
            },
            {
              reference: "CLAIM-REJECTED",
              type: "REVIEW",
              status: "REJECTED",
              herd: { id: "herd-1", name: "Barn Herd" },
              createdAt: "2024-02-15T12:00:00.000Z",
              data: {
                typeOfLivestock: "beef",
                dateOfVisit: "2024-03-10",
              },
            },
            {
              reference: "CLAIM-SUBMITTED",
              type: "REVIEW",
              status: "SUBMITTED",
              herd: { id: "herd-1", name: "Barn Herd" },
              createdAt: "2024-02-15T12:00:00.000Z",
              data: {
                typeOfLivestock: "beef",
                dateOfVisit: "2024-03-10",
              },
            },
            {
              reference: "CLAIM-NO-STATUS",
              type: "REVIEW",
              herd: { id: "herd-1", name: "Barn Herd" },
              createdAt: "2024-02-15T12:00:00.000Z",
              data: {
                typeOfLivestock: "beef",
                dateOfVisit: "2024-03-10",
              },
            },
            {
              reference: "CLAIM-DIFF-HERD",
              type: "REVIEW",
              status: "PAID",
              herd: { id: "herd-2", name: "Other Herd" },
              createdAt: "2024-02-15T12:00:00.000Z",
              data: {
                typeOfLivestock: "beef",
                dateOfVisit: "2024-03-10",
              },
            },
            {
              reference: "CLAIM-DIFF-SPECIES",
              type: "REVIEW",
              status: "PAID",
              herd: { id: "herd-1", name: "Barn Herd" },
              createdAt: "2024-02-15T12:00:00.000Z",
              data: {
                typeOfLivestock: "dairy",
                dateOfVisit: "2024-03-10",
              },
            },
            {
              reference: "CLAIM-FUTURE-DATE",
              type: "REVIEW",
              status: "PAID",
              herd: { id: "herd-1", name: "Barn Herd" },
              createdAt: "2024-02-15T12:00:00.000Z",
              data: {
                typeOfLivestock: "beef",
                dateOfVisit: "2024-06-10",
              },
            },
            {
              reference: "CLAIM-FOLLOW-UP",
              type: "FOLLOW_UP",
              status: "PAID",
              herd: { id: "herd-1", name: "Barn Herd" },
              createdAt: "2024-02-15T12:00:00.000Z",
              data: {
                typeOfLivestock: "beef",
                dateOfVisit: "2024-03-10",
              },
            },
          ],
        });

      const res = await server.inject({ method: "GET", url, auth });

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);

      expect($("input[name='reviews']")).toHaveLength(1);
      expect($("input[value='CLAIM-PAID']")).toHaveLength(1);
      expect($("input[value='CLAIM-IN-CHECK']")).toHaveLength(0);
      expect($("input[value='CLAIM-REJECTED']")).toHaveLength(0);
      expect($("input[value='CLAIM-SUBMITTED']")).toHaveLength(0);
      expect($("input[value='CLAIM-NO-STATUS']")).toHaveLength(0);
      expect($("input[value='CLAIM-DIFF-HERD']")).toHaveLength(0);
      expect($("input[value='CLAIM-DIFF-SPECIES']")).toHaveLength(0);
      expect($("input[value='CLAIM-FUTURE-DATE']")).toHaveLength(0);
      expect($("input[value='CLAIM-FOLLOW-UP']")).toHaveLength(0);
    });

    it("should exclude review claims that are outside the 10-month window", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
        .mockReturnValue({
          herdName: "Barn Herd",
          typeOfLivestock: "beef",
          dateOfVisit: "2025-05-10",
          herdId: "herd-1",
          previousClaims: [
            {
              reference: "CLAIM-OLD",
              type: "REVIEW",
              status: "PAID",
              herd: { id: "herd-1", name: "Barn Herd" },
              createdAt: "2024-02-15T12:00:00.000Z",
              data: {
                typeOfLivestock: "beef",
                dateOfVisit: "2024-01-10",
              },
            },
          ],
        });

      const res = await server.inject({ method: "GET", url, auth });

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      expect($("input[name='reviews']")).toHaveLength(0);
    });

    it("should exclude review claims that have already been used by a follow-up claim (via reviewReference)", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
        .mockReturnValue({
          herdName: "Barn Herd",
          typeOfLivestock: "beef",
          dateOfVisit: "2024-05-10",
          herdId: "herd-1",
          previousClaims: [
            {
              reference: "REVIEW-CLAIM-USED",
              type: "REVIEW",
              status: "PAID",
              herd: { id: "herd-1", name: "Barn Herd" },
              createdAt: "2024-01-15T12:00:00.000Z",
              data: {
                typeOfLivestock: "beef",
                dateOfVisit: "2024-01-10",
              },
            },
            {
              reference: "REVIEW-CLAIM-UNUSED-1",
              type: "REVIEW",
              status: "PAID",
              herd: { id: "herd-1", name: "Barn Herd" },
              createdAt: "2024-02-15T12:00:00.000Z",
              data: {
                typeOfLivestock: "beef",
                dateOfVisit: "2024-02-10",
              },
            },
            {
              reference: "REVIEW-CLAIM-UNUSED-2",
              type: "REVIEW",
              status: "READY_TO_PAY",
              herd: { id: "herd-1", name: "Barn Herd" },
              createdAt: "2024-03-15T12:00:00.000Z",
              data: {
                typeOfLivestock: "beef",
                dateOfVisit: "2024-03-10",
              },
            },
            {
              reference: "FOLLOW-UP-1",
              reviewReference: "REVIEW-CLAIM-USED",
              type: "FOLLOW_UP",
              status: "PAID",
              herd: { id: "herd-1", name: "Barn Herd" },
              createdAt: "2024-02-01T12:00:00.000Z",
              data: {
                typeOfLivestock: "beef",
                dateOfVisit: "2024-01-20",
              },
            },
          ],
        });

      const res = await server.inject({ method: "GET", url, auth });

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);

      expect($("input[value='REVIEW-CLAIM-USED']")).toHaveLength(0);
      expect($("input[value='REVIEW-CLAIM-UNUSED-1']")).toHaveLength(1);
      expect($("input[value='REVIEW-CLAIM-UNUSED-2']")).toHaveLength(1);
      expect($("input[value='FOLLOW-UP-1']")).toHaveLength(0);
      expect($("input[name='reviews']")).toHaveLength(2);
    });

    it("should exclude all review claims when all reviews are used by follow-up claims", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
        .mockReturnValue({
          herdName: "Barn Herd",
          typeOfLivestock: "beef",
          dateOfVisit: "2024-05-10",
          herdId: "herd-1",
          previousClaims: [
            {
              reference: "REVIEW-CLAIM-1",
              type: "REVIEW",
              status: "PAID",
              herd: { id: "herd-1", name: "Barn Herd" },
              createdAt: "2024-01-15T12:00:00.000Z",
              data: {
                typeOfLivestock: "beef",
                dateOfVisit: "2024-01-10",
              },
            },
            {
              reference: "FOLLOW-UP-1",
              reviewReference: "REVIEW-CLAIM-1",
              type: "FOLLOW_UP",
              status: "PAID",
              herd: { id: "herd-1", name: "Barn Herd" },
              createdAt: "2024-02-01T12:00:00.000Z",
              data: {
                typeOfLivestock: "beef",
                dateOfVisit: "2024-01-20",
              },
            },
          ],
        });

      const res = await server.inject({ method: "GET", url, auth });

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);

      expect($("input[name='reviews']")).toHaveLength(0);
    });

    it("should render correctly when there are no previous claims", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
        .mockReturnValue({
          herdName: "Meadow Flock",
          typeOfLivestock: "sheep",
          dateOfVisit: "2024-05-10",
          herdId: "flock-1",
          previousClaims: [],
        });

      const res = await server.inject({ method: "GET", url, auth });

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      expect($("input[name='reviews']")).toHaveLength(0);

      const fieldsetHint = $("#reviews-hint").html();
      expect(fieldsetHint).toContain("<b>Herd Name</b>: Meadow Flock<br><b>Species</b>: sheep");
    });
  });

  describe("POST", () => {
    it("should save selectedReview in session and redirect to checkHerdDetails when a review is selected", async () => {
      const res = await server.inject({
        method: "POST",
        url,
        auth,
        payload: {
          crumb,
          reviews: "CLAIM-1",
        },
        headers: { cookie: `crumb=${crumb}` },
      });

      expect(res.statusCode).toBe(302);
      expect(res.headers.location).toBe(livestockClaimRoutes.checkHerdDetails);
      expect(setSessionData).toHaveBeenCalledWith(
        expect.anything(),
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.selectedReview,
        "CLAIM-1",
      );
    });

    it("should return 400 with error message and re-render page when review is missing from payload", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
        .mockReturnValue({
          herdName: "Barn Herd",
          typeOfLivestock: "beef",
          dateOfVisit: "2024-05-10",
          herdId: "herd-1",
          previousClaims: [
            {
              reference: "CLAIM-1",
              type: "REVIEW",
              status: "PAID",
              herd: { id: "herd-1", name: "Barn Herd" },
              createdAt: "2024-02-15T12:00:00.000Z",
              data: {
                typeOfLivestock: "beef",
                dateOfVisit: "2024-02-10",
              },
            },
          ],
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

      expect($("title").text()).toContain("Error:");
      expect($(".govuk-error-summary").text()).toContain(
        "Select the review claim this follow up is",
      );
      expect($(".govuk-back-link").attr("href")).toBe(livestockClaimRoutes.selectReview);
      expect($("input[value='CLAIM-1']")).toHaveLength(1);
    });

    it("should return 400 when review is empty string", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
        .mockReturnValue({
          herdName: "Barn Herd",
          typeOfLivestock: "beef",
          dateOfVisit: "2024-05-10",
          herdId: "herd-1",
          previousClaims: [],
        });

      const res = await server.inject({
        method: "POST",
        url,
        auth,
        payload: {
          crumb,
          reviews: "",
        },
        headers: { cookie: `crumb=${crumb}` },
      });

      expect(res.statusCode).toBe(400);
      const $ = cheerio.load(res.payload);
      expect($(".govuk-error-summary").text()).toContain(
        "Select the review claim this follow up is",
      );
    });
  });
});

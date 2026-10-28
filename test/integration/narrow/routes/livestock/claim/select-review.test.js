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
    it("should render matching review claims with formatted hints", async () => {
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
              herd: { id: "herd-2", name: "Other Herd" },
              createdAt: "2024-02-15T12:00:00.000Z",
              data: {
                typeOfLivestock: "beef",
                dateOfVisit: "2024-02-10",
                dateOfTesting: "2024-02-05",
              },
            },
          ],
        });

      const res = await server.inject({ method: "GET", url, auth });

      expect(res.statusCode).toBe(200);
      const $ = cheerio.load(res.payload);
      expect($("input[value='CLAIM-1']")).toHaveLength(1);

      const fieldsetHint = $("#reviews-hint").html();
      expect(fieldsetHint).toContain("<b>Herd Name</b>: Barn Herd<br><b>Species</b>: beef");

      const itemHint = $(".govuk-radios__hint").html();
      expect(itemHint).toContain("<b>Claim number</b>: CLAIM-1");
    });
  });

  describe("POST", () => {
    it("should save selectedReview and redirect to checkHerdDetails", async () => {
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

    it("should return 400 when review is not selected", async () => {
      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
        .mockReturnValue({
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

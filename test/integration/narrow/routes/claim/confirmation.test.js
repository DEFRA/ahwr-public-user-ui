import * as cheerio from "cheerio";
import { createServer } from "../../../../../app/server.js";
import { getReviewType } from "../../../../../app/lib/utils.js";
import { getSessionData, sessionEntryKeys, sessionKeys } from "../../../../../app/session/index.js";
import { when } from "jest-when";

jest.mock("../../../../../app/session");

describe("Claim confirmation", () => {
  let server;

  beforeAll(async () => {
    server = await createServer();
    await server.initialize();
  });

  afterAll(async () => {
    await server.stop();
  });

  const reference = "TBD-F021-723B";
  const auth = { credentials: {}, strategy: "cookie" };
  const url = `/confirmation`;

  afterEach(() => {
    jest.clearAllMocks();
  });

  test.each([{ typeOfReview: "FOLLOW_UP" }, { typeOfReview: "REVIEW" }])(
    "GET endemicsConfirmation route %s",
    async ({ typeOfReview }) => {
      const { isReview } = getReviewType(typeOfReview);
      const options = {
        method: "GET",
        url,
        auth,
      };

      when(getSessionData)
        .calledWith(expect.anything(), sessionEntryKeys.endemicsClaim)
        .mockReturnValue({
          reference,
          amount: 55,
          typeOfReview,
        });

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

      const res = await server.inject(options);

      const $ = cheerio.load(res.payload);

      expect(res.statusCode).toBe(200);
      expect($("#amount").text()).toContain("55");
      expect($("#reference").text().trim()).toEqual(reference);
      expect($("#message").text().trim()).toContain(
        isReview ? "animal health and welfare review" : "endemic disease follow-up",
      );
    },
  );
});

import { canMakeClaim } from "./can-make-claim.js";
import { claimType } from "ffc-ahwr-common-library";
import { config } from "../config/index.js";

const organisation = { name: "Test Farm", sbi: "123456789" };

const reviewClaim = (dateOfVisit, status = "PAID") => ({
  type: claimType.review,
  status,
  data: { typeOfLivestock: "beef", dateOfVisit },
});

const followUpClaim = (dateOfVisit) => ({
  type: claimType.endemics,
  status: "PAID",
  data: { typeOfLivestock: "beef", dateOfVisit },
});

const makeReview = (dateOfVisit, prevClaims) =>
  canMakeClaim({
    prevClaims,
    typeOfReview: claimType.review,
    dateOfVisit,
    organisation,
    typeOfLivestock: "beef",
  });

const makeFollowUp = (dateOfVisit, prevClaims) =>
  canMakeClaim({
    prevClaims,
    typeOfReview: claimType.endemics,
    dateOfVisit,
    organisation,
    typeOfLivestock: "beef",
  });

describe("review timing rules (minimum 10-month gap)", () => {
  it("allows a review exactly 10 calendar months after the previous review", () => {
    expect(makeReview("2025-01-01", [reviewClaim("2024-03-01")])).toBe("");
  });

  it("allows a review more than 10 months after the previous review", () => {
    expect(makeReview("2025-02-01", [reviewClaim("2024-03-01")])).toBe("");
  });

  it("blocks a review less than 10 months after the previous review", () => {
    expect(makeReview("2024-12-31", [reviewClaim("2024-03-01")])).toBe(
      "There must be at least 10 months between your reviews.",
    );
  });

  it("clamps end-of-month: 31 Jan + 10 months allows a review on 30 Nov but not 29 Nov", () => {
    expect(makeReview("2024-11-30", [reviewClaim("2024-01-31")])).toBe("");
    expect(makeReview("2024-11-29", [reviewClaim("2024-01-31")])).toBe(
      "There must be at least 10 months between your reviews.",
    );
  });
});

describe("follow-up timing rules", () => {
  it("allows a follow-up exactly 10 months after its associated review", () => {
    expect(makeFollowUp("2025-01-01", [reviewClaim("2024-03-01")])).toBe("");
  });

  it("allows a follow-up less than 10 months after its associated review", () => {
    expect(makeFollowUp("2024-06-01", [reviewClaim("2024-03-01")])).toBe("");
  });

  it("blocks a follow-up more than 10 months after its associated review", () => {
    expect(makeFollowUp("2025-01-02", [reviewClaim("2024-03-01")])).toBe(
      "There must be no more than 10 months between your reviews and follow-ups.",
    );
  });

  it("allows a follow-up exactly 10 months after the previous follow-up", () => {
    const prevClaims = [reviewClaim("2024-03-01"), followUpClaim("2024-03-01")];
    expect(makeFollowUp("2025-01-01", prevClaims)).toBe("");
  });

  it("blocks a follow-up less than 10 months after the previous follow-up", () => {
    const prevClaims = [reviewClaim("2024-03-01"), followUpClaim("2024-03-01")];
    expect(makeFollowUp("2024-12-31", prevClaims)).toBe(
      "There must be at least 10 months between your follow-ups.",
    );
  });

  it("blocks a follow-up dated before its associated review", () => {
    expect(makeFollowUp("2024-02-01", [reviewClaim("2024-03-01")])).toBe(
      "The follow-up must be after your review",
    );
  });
});

describe("livestock timing rules exemption toggle (AHWR-2286)", () => {
  // A review 1 month after the previous one: blocked unless the exemption is on.
  const reviewOneMonthLater = () => makeReview("2024-04-01", [reviewClaim("2024-03-01")]);

  afterEach(() => {
    config.set("livestockTimingRulesExemption.enabled", false);
  });

  it("is off by default, so the 10-month gaps still apply", () => {
    expect(config.get("livestockTimingRulesExemption.enabled")).toBe(false);
    expect(reviewOneMonthLater()).toBe("There must be at least 10 months between your reviews.");
    expect(
      makeFollowUp("2024-06-01", [followUpClaim("2024-05-01"), reviewClaim("2024-04-01")]),
    ).toBe("There must be at least 10 months between your follow-ups.");
  });

  describe("when on", () => {
    beforeEach(() => {
      config.set("livestockTimingRulesExemption.enabled", true);
    });

    it("allows a review less than 10 months after the previous review", () => {
      expect(reviewOneMonthLater()).toBe("");
    });

    it("allows a follow-up less than 10 months after a follow-up for an earlier review", () => {
      expect(
        makeFollowUp("2024-06-01", [
          reviewClaim("2024-05-01"),
          followUpClaim("2024-04-15"),
          reviewClaim("2024-04-01"),
        ]),
      ).toBe("");
    });

    it("blocks a second follow-up for the same review", () => {
      expect(
        makeFollowUp("2024-06-01", [followUpClaim("2024-05-01"), reviewClaim("2024-04-01")]),
      ).toBe("You can only claim for one follow-up for each review.");
    });

    it("blocks a second follow-up when the first is on the same day as the review", () => {
      expect(
        makeFollowUp("2024-06-01", [followUpClaim("2024-04-01"), reviewClaim("2024-04-01")]),
      ).toBe("You can only claim for one follow-up for each review.");
    });

    it("still blocks a follow-up more than 10 months after its review", () => {
      expect(makeFollowUp("2025-02-01", [reviewClaim("2024-03-01")])).toBe(
        "There must be no more than 10 months between your reviews and follow-ups.",
      );
    });

    it("still requires the follow-up to be after its review", () => {
      expect(makeFollowUp("2024-02-01", [reviewClaim("2024-03-01")])).toBe(
        "The follow-up must be after your review",
      );
    });

    it("still requires the review to be approved before the follow-up", () => {
      expect(makeFollowUp("2024-06-01", [reviewClaim("2024-04-01", "ON_HOLD")])).toBe(
        "Your review claim must have been approved before you claim for the follow-up that happened after it.",
      );
    });
  });
});

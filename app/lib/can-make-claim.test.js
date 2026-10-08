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

describe("10-month exemption window", () => {
  // A review 1 month after the previous one: blocked unless its visit date is in the window.
  const reviewOneMonthLater = () => makeReview("2024-04-01", [reviewClaim("2024-03-01")]);

  const setWindow = (start, end = null) => {
    config.set("tenMonthExemption.start", start);
    config.set("tenMonthExemption.end", end);
  };

  afterEach(() => {
    config.set("tenMonthExemption.start", null);
    config.set("tenMonthExemption.end", null);
  });

  it("is not set by default, so the 10-month gaps still apply", () => {
    expect(config.get("tenMonthExemption.start")).toBeFalsy();
    expect(reviewOneMonthLater()).toBe("There must be at least 10 months between your reviews.");
    expect(
      makeFollowUp("2024-06-01", [followUpClaim("2024-05-01"), reviewClaim("2024-04-01")]),
    ).toBe("There must be at least 10 months between your follow-ups.");
  });

  describe("when the new claim's visit date is in the window", () => {
    beforeEach(() => {
      setWindow("2024-01-01", "2025-12-31");
    });

    it("allows a review less than 10 months after the previous review", () => {
      expect(reviewOneMonthLater()).toBe("");
    });

    it("allows a follow-up less than 10 months after the previous follow-up", () => {
      expect(
        makeFollowUp("2024-06-01", [followUpClaim("2024-05-01"), reviewClaim("2024-04-01")]),
      ).toBe("");
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

    it("allows a review in the window even when the previous review is before it", () => {
      setWindow("2024-04-01", "2024-12-31");

      expect(makeReview("2024-04-15", [reviewClaim("2024-03-01")])).toBe("");
    });

    it("has no end to the window when only the start is set", () => {
      setWindow("2024-01-01");

      expect(makeReview("2030-04-01", [reviewClaim("2030-03-01")])).toBe("");
    });
  });

  describe("when the new claim's visit date is outside the window", () => {
    const reviewGapError = "There must be at least 10 months between your reviews.";
    const followUpGapError = "There must be at least 10 months between your follow-ups.";

    it("blocks a review dated before the window start", () => {
      setWindow("2024-05-01", "2024-12-31");

      expect(reviewOneMonthLater()).toBe(reviewGapError);
    });

    it("blocks a review dated after the window end", () => {
      setWindow("2024-01-01", "2024-03-31");

      expect(reviewOneMonthLater()).toBe(reviewGapError);
    });

    it("blocks a follow-up dated before the window start with the follow-up gap", () => {
      setWindow("2024-07-01", "2024-12-31");

      expect(
        makeFollowUp("2024-06-01", [followUpClaim("2024-05-01"), reviewClaim("2024-04-01")]),
      ).toBe(followUpGapError);
    });

    it("blocks a follow-up dated after the window end with the follow-up gap", () => {
      setWindow("2024-01-01", "2024-05-31");

      expect(
        makeFollowUp("2024-06-01", [followUpClaim("2024-05-01"), reviewClaim("2024-04-01")]),
      ).toBe(followUpGapError);
    });
  });
});

import { isLivestockHerdAtReviewLimit, isPoultrySiteAtClaimLimit } from "./herd-claim-limit.js";
import { config } from "../config/index.js";
import { claimType } from "ffc-ahwr-common-library";

const review = (status = "PAID") => ({ type: claimType.review, status });
const followUp = (status = "PAID") => ({ type: claimType.endemics, status });
const poultryClaim = (status = "PAID") => ({ status });

afterEach(() => {
  config.set("herdClaimLimit.enabled", false);
});

describe("isLivestockHerdAtReviewLimit", () => {
  it("returns false when the feature flag is off, regardless of count", () => {
    config.set("herdClaimLimit.enabled", false);
    config.set("herdClaimLimit.livestock", 1);

    expect(isLivestockHerdAtReviewLimit([review(), review()])).toBe(false);
  });

  it("counts only review claims towards the limit (follow-ups are ignored)", () => {
    config.set("herdClaimLimit.enabled", true);
    config.set("herdClaimLimit.livestock", 2);

    expect(isLivestockHerdAtReviewLimit([review(), followUp(), followUp()])).toBe(false);
  });

  it("ignores rejected review claims", () => {
    config.set("herdClaimLimit.enabled", true);
    config.set("herdClaimLimit.livestock", 2);

    expect(isLivestockHerdAtReviewLimit([review(), review("REJECTED")])).toBe(false);
  });

  it("is at the limit when non-rejected reviews reach the limit", () => {
    config.set("herdClaimLimit.enabled", true);
    config.set("herdClaimLimit.livestock", 2);

    expect(isLivestockHerdAtReviewLimit([review(), review()])).toBe(true);
  });
});

describe("isPoultrySiteAtClaimLimit", () => {
  it("returns false when the feature flag is off, regardless of count", () => {
    config.set("herdClaimLimit.enabled", false);
    config.set("herdClaimLimit.poultry", 1);

    expect(isPoultrySiteAtClaimLimit([poultryClaim(), poultryClaim()])).toBe(false);
  });

  it("counts every non-rejected claim for the site", () => {
    config.set("herdClaimLimit.enabled", true);
    config.set("herdClaimLimit.poultry", 2);

    expect(isPoultrySiteAtClaimLimit([poultryClaim()])).toBe(false);
    expect(isPoultrySiteAtClaimLimit([poultryClaim(), poultryClaim()])).toBe(true);
  });

  it("ignores rejected claims", () => {
    config.set("herdClaimLimit.enabled", true);
    config.set("herdClaimLimit.poultry", 2);

    expect(isPoultrySiteAtClaimLimit([poultryClaim(), poultryClaim("REJECTED")])).toBe(false);
  });
});

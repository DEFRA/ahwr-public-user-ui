import { claimType } from "ffc-ahwr-common-library";
import { config } from "../config/index.js";

/**
 * Used to check if we have reached the limit of review claims for a herd/flock
 *
 * @param {Array<{type: string, status: string}>} herdClaims - Claims for the herd.
 * @returns {boolean} True when the herd has reached the review claim limit.
 */
export const isLivestockHerdAtReviewLimit = (herdClaims) => {
  if (!config.get("herdClaimLimit.enabled")) {
    return false;
  }

  const reviewClaims = herdClaims.filter((claim) => claim.type === claimType.review);

  return reviewClaims.length >= config.get("herdClaimLimit.livestock");
};

/**
 * Used to check if we have reached the limit of claims for a site. Poultry has no follow-ups.
 *
 * @param {Array<{status: string}>} siteClaims - Claims for the site.
 * @returns {boolean} True when the site has reached the poultry claim limit.
 */
export const isPoultrySiteAtClaimLimit = (siteClaims) => {
  if (!config.get("herdClaimLimit.enabled")) {
    return false;
  }

  return siteClaims.length >= config.get("herdClaimLimit.poultry");
};

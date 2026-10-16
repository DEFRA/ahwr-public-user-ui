import { areDatesWithin10Months, isLessThan10MonthsApart, getLivestockTypes } from "./utils.js";
import { getOldWorldClaimFromApplication } from "./claim-helper.js";
import { claimType } from "ffc-ahwr-common-library";
import { isWithinTenMonthExemption } from "./timing-rules-exemption.js";

const isBlockedByTenMonthGap = (dateOfVisit, previousDateOfVisit) =>
  !isWithinTenMonthExemption(dateOfVisit) &&
  isLessThan10MonthsApart(dateOfVisit, previousDateOfVisit);

const isFollowUpWithinValidReviewWindow = (dateOfVisit, claimDateOfVisit) =>
  areDatesWithin10Months(dateOfVisit, claimDateOfVisit);

export const canMakeReviewClaim = (dateOfVisit, prevReviewClaimDateOfVisit) => {
  if (!prevReviewClaimDateOfVisit) {
    return { error: "", reviews: [] };
  }

  if (isBlockedByTenMonthGap(dateOfVisit, prevReviewClaimDateOfVisit)) {
    return { error: "There must be at least 10 months between your reviews.", reviews: [] };
  }

  return { error: "", reviews: [] };
};

const formatTypeOfLivestock = (typeOfLivestock) => {
  const { isPigs, isSheep } = getLivestockTypes(typeOfLivestock);
  return isPigs || isSheep ? typeOfLivestock : `${typeOfLivestock} cattle`;
};

function singleReview(prevReviewClaims, organisation, typeOfLivestock, prevClaims, dateOfVisit) {
  if (prevReviewClaims[0].status === "REJECTED") {
    return {
      error: `${organisation.name} - SBI ${organisation.sbi} had a failed review claim for ${formatTypeOfLivestock(typeOfLivestock)} in the last 10 months.`,
      reviews: [],
    };
  }

  if (!["READY_TO_PAY", "PAID"].includes(prevReviewClaims[0].status)) {
    return {
      error:
        "Your review claim must have been approved before you claim for the follow-up that happened after it.",
      reviews: [],
    };
  }

  const followUpWithin10Month = prevClaims.find(
    (claim) =>
      claim.type === claimType.endemics &&
      isBlockedByTenMonthGap(dateOfVisit, claim.data.dateOfVisit),
  );
  const thereAreEndemicClaims = prevClaims.some((claim) => claim.type === claimType.endemics);

  if (thereAreEndemicClaims && followUpWithin10Month) {
    return { error: "There must be at least 10 months between your follow-ups.", reviews: [] };
  }
  return { error: "", reviews: prevReviewClaims };
}

export const canMakeEndemicsClaim = (dateOfVisit, prevClaims, organisation, typeOfLivestock) => {
  let prevReviewClaims = prevClaims.filter(
    (claim) =>
      claim.type === claimType.review &&
      new Date(claim.data.dateOfVisit) < new Date(dateOfVisit) &&
      isFollowUpWithinValidReviewWindow(dateOfVisit, claim.data.dateOfVisit),
  );

  if (prevReviewClaims.length === 0) {
    return { error: "There is no review within the timeframe of this follow up", reviews: [] };
  }

  const existingReviewReferences = prevClaims
    .filter(
      (claim) =>
        claim.type === claimType.endemics &&
        claim.reviewReference &&
        new Date(claim.data.dateOfVisit) < new Date(dateOfVisit),
    )
    .map((claim) => claim.reviewReference);

  if (existingReviewReferences.length !== 0) {
    const reviewsWithNoFollowupsClaims = prevReviewClaims.filter(
      (review) => !existingReviewReferences.includes(review.reference),
    );

    if (reviewsWithNoFollowupsClaims.length === 0) {
      return { error: "There is no review eligible for this follow up.", reviews: [] };
    }
    prevReviewClaims = reviewsWithNoFollowupsClaims;
  }

  if (prevReviewClaims.length === 1) {
    return singleReview(prevReviewClaims, organisation, typeOfLivestock, prevClaims, dateOfVisit);
  } else {
    // filter rejected, not in PAID or READY_TO_PAY
    const rejectedReviews = prevReviewClaims.filter((claim) => claim.status !== "REJECTED");
    const previousReviews = rejectedReviews.filter(
      (claim) => claim.status === "READY_TO_PAY" || claim.status === "PAID",
    );

    if (previousReviews.length === 0) {
      return { error: "There is no review eligible for this follow up.", reviews: [] };
    }
    return { error: "", reviews: previousReviews };
  }
};

export const canMakeClaim = ({
  prevClaims,
  typeOfReview,
  dateOfVisit,
  organisation,
  typeOfLivestock,
  oldWorldApplication,
}) => {
  // A follow-up must be preceded by a review on the new-world agreement. A review, however,
  // still respects the 10-month gap against an old-world review.
  if (typeOfReview === claimType.review) {
    const previousReviewClaim =
      prevClaims.find((claim) => claim.type === claimType.review) ||
      getOldWorldClaimFromApplication(oldWorldApplication, typeOfLivestock);

    return canMakeReviewClaim(dateOfVisit, previousReviewClaim?.data.dateOfVisit);
  }

  return canMakeEndemicsClaim(dateOfVisit, prevClaims, organisation, typeOfLivestock);
};

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
    return {};
  }

  if (isBlockedByTenMonthGap(dateOfVisit, prevReviewClaimDateOfVisit)) {
    return { error: "There must be at least 10 months between your reviews." };
  }

  return {};
};

const formatTypeOfLivestock = (typeOfLivestock) => {
  const { isPigs, isSheep } = getLivestockTypes(typeOfLivestock);
  return isPigs || isSheep ? typeOfLivestock : `${typeOfLivestock} cattle`;
};

function validateSingleReview(
  prevReviewClaims,
  organisation,
  typeOfLivestock,
  prevClaims,
  dateOfVisit,
) {
  if (prevReviewClaims[0].status === "REJECTED") {
    return {
      error: `${organisation.name} - SBI ${organisation.sbi} had a failed review claim for ${formatTypeOfLivestock(typeOfLivestock)} in the last 10 months.`,
    };
  }

  if (!["READY_TO_PAY", "PAID"].includes(prevReviewClaims[0].status)) {
    return {
      error:
        "Your review claim must have been approved before you claim for the follow-up that happened after it.",
    };
  }

  const hasRecentFollowUp = prevClaims.some(
    (claim) =>
      claim.type === claimType.endemics &&
      isBlockedByTenMonthGap(dateOfVisit, claim.data.dateOfVisit),
  );

  if (hasRecentFollowUp) {
    return { error: "There must be at least 10 months between your follow-ups." };
  }
  return { reviews: prevReviewClaims };
}

function validateMultipleReviews(prevReviewClaims) {
  const previousReviews = prevReviewClaims.filter(
    (claim) => claim.status === "READY_TO_PAY" || claim.status === "PAID",
  );

  if (previousReviews.length === 0) {
    return { error: "There is no review eligible for this follow up." };
  }
  return { reviews: previousReviews };
}

export function filterReviewsWithNoFollowUps(prevClaims, dateOfVisit) {
  let prevReviewClaims = prevClaims.filter(
    (claim) =>
      claim.type === claimType.review &&
      new Date(claim.data.dateOfVisit) <= new Date(dateOfVisit) &&
      isFollowUpWithinValidReviewWindow(dateOfVisit, claim.data.dateOfVisit),
  );

  if (prevReviewClaims.length === 0) {
    return { error: "There is no review within the timeframe of this follow up", reviews: [] };
  }

  const existingReviewReferences = prevClaims
    .filter((claim) => claim.type === claimType.endemics && claim.reviewReference)
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

  return { reviews: prevReviewClaims };
}

export const canMakeEndemicsClaim = (dateOfVisit, prevClaims, organisation, typeOfLivestock) => {
  const { error, reviews: prevReviewClaims } = filterReviewsWithNoFollowUps(
    prevClaims,
    dateOfVisit,
  );
  if (error) {
    return { error };
  }
  if (prevReviewClaims.length === 1) {
    return validateSingleReview(
      prevReviewClaims,
      organisation,
      typeOfLivestock,
      prevClaims,
      dateOfVisit,
    );
  } else {
    return validateMultipleReviews(prevReviewClaims);
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

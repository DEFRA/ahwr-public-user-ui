import { areDatesWithin10Months, isLessThan10MonthsApart, getLivestockTypes } from "./utils.js";
import { getOldWorldClaimFromApplication } from "./claim-helper.js";
import { claimType } from "ffc-ahwr-common-library";

export const canMakeReviewClaim = (dateOfVisit, prevReviewClaimDateOfVisit) => {
  if (!prevReviewClaimDateOfVisit) {
    return "";
  }

  if (isLessThan10MonthsApart(dateOfVisit, prevReviewClaimDateOfVisit)) {
    return "There must be at least 10 months between your reviews.";
  }

  return "";
};

const formatTypeOfLivestock = (typeOfLivestock) => {
  const { isPigs, isSheep } = getLivestockTypes(typeOfLivestock);
  return isPigs || isSheep ? typeOfLivestock : `${typeOfLivestock} cattle`;
};

export const canMakeEndemicsClaim = (
  dateOfVisit,
  prevReviewClaim,
  prevEndemicsClaimDateOfVisit,
  organisation,
  typeOfLivestock,
) => {
  if (!areDatesWithin10Months(dateOfVisit, prevReviewClaim.data.dateOfVisit)) {
    return "There must be no more than 10 months between your reviews and follow-ups.";
  }

  if (prevReviewClaim.status === "REJECTED") {
    return `${organisation.name} - SBI ${organisation.sbi} had a failed review claim for ${formatTypeOfLivestock(typeOfLivestock)} in the last 10 months.`;
  }

  if (!["READY_TO_PAY", "PAID"].includes(prevReviewClaim.status)) {
    return "Your review claim must have been approved before you claim for the follow-up that happened after it.";
  }

  if (
    prevEndemicsClaimDateOfVisit &&
    isLessThan10MonthsApart(dateOfVisit, prevEndemicsClaimDateOfVisit)
  ) {
    return "There must be at least 10 months between your follow-ups.";
  }

  if (new Date(dateOfVisit) < new Date(prevReviewClaim.data.dateOfVisit)) {
    return "The follow-up must be after your review";
  }

  return "";
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

  const prevReviewClaim = prevClaims.find((claim) => claim.type === claimType.review);
  const prevEndemicsClaim = prevClaims.find((claim) => claim.type === claimType.endemics);

  return canMakeEndemicsClaim(
    dateOfVisit,
    prevReviewClaim,
    prevEndemicsClaim?.data.dateOfVisit,
    organisation,
    typeOfLivestock,
  );
};

import { areDatesWithin10Months, getLivestockTypes } from "./utils.js";
import { getOldWorldClaimFromApplication } from "./claim-helper.js";
import { claimConstants } from "../constants/claim-constants.js";

export const canMakeReviewClaim = (dateOfVisit, prevReviewClaimDateOfVisit) => {
  if (!prevReviewClaimDateOfVisit) {
    return "";
  }

  if (areDatesWithin10Months(dateOfVisit, prevReviewClaimDateOfVisit)) {
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
    areDatesWithin10Months(dateOfVisit, prevEndemicsClaimDateOfVisit)
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
  const prevReviewClaim =
    prevClaims.find((claim) => claim.type === claimConstants.claimType.review) ||
    getOldWorldClaimFromApplication(oldWorldApplication, typeOfLivestock);
  const prevEndemicsClaim = prevClaims.find(
    (claim) => claim.type === claimConstants.claimType.endemics,
  );

  return typeOfReview === claimConstants.claimType.review
    ? canMakeReviewClaim(dateOfVisit, prevReviewClaim?.data.dateOfVisit)
    : canMakeEndemicsClaim(
        dateOfVisit,
        prevReviewClaim,
        prevEndemicsClaim?.data.dateOfVisit,
        organisation,
        typeOfLivestock,
      );
};

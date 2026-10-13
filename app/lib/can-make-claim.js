import { areDatesWithin10Months, isLessThan10MonthsApart, getLivestockTypes } from "./utils.js";
import { getOldWorldClaimFromApplication } from "./claim-helper.js";
import { claimType } from "ffc-ahwr-common-library";
import { isWithinTenMonthExemption } from "./timing-rules-exemption.js";

const isBlockedBy10Gap = (dateOfVisit, previousDateOfVisit) =>
  !isWithinTenMonthExemption(dateOfVisit) &&
  isLessThan10MonthsApart(dateOfVisit, previousDateOfVisit);

const isFollowFromReviewBlockedBy10Gap= (dateOfVisit,claimDateOfVisit)=>
  areDatesWithin10Months(dateOfVisit,claimDateOfVisit)

export const canMakeReviewClaim = (dateOfVisit, prevReviewClaimDateOfVisit) => {
  if (!prevReviewClaimDateOfVisit) {
    return "";
  }

  if (isBlockedBy10Gap(dateOfVisit, prevReviewClaimDateOfVisit)) {
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
  prevClaims,
  organisation,
  typeOfLivestock,
) => {

  const prevReviewClaim = prevClaims.find((claim) => claim.type === claimType.review
    && new Date(claim.data.dateOfVisit) < new Date(dateOfVisit)
    && isFollowFromReviewBlockedBy10Gap(dateOfVisit, claim.data.dateOfVisit));

  if (prevReviewClaim === undefined) {
    return "There is no review within the timeframe of this follow up";
  }

  if (prevReviewClaim.status === "REJECTED") {
    return `${organisation.name} - SBI ${organisation.sbi} had a failed review claim for ${formatTypeOfLivestock(typeOfLivestock)} in the last 10 months.`;
  }

  if (!["READY_TO_PAY", "PAID"].includes(prevReviewClaim.status)) {
    return "Your review claim must have been approved before you claim for the follow-up that happened after it.";
  }

  const followUpWithin10Month = prevClaims.find(
    (claim) => claim.type === claimType.endemics
      && isBlockedBy10Gap(dateOfVisit, claim.data.dateOfVisit),
  );
  const thereAreEndemicClaims = prevClaims.some(
    (claim) => claim.type === claimType.endemics
  );

  if (thereAreEndemicClaims && followUpWithin10Month) {
    return "There must be at least 10 months between your follow-ups.";
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

  return canMakeEndemicsClaim(
    dateOfVisit,
    prevClaims,
    organisation,
    typeOfLivestock,
  );
};

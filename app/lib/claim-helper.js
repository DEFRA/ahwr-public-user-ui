import { MULTIPLE_HERDS_RELEASE_DATE, claimConstants } from "../constants/claim-constants.js";
import { areDatesWithin10Months } from "./utils";

const getPastReviewClaimsForSpeciesAndHerd = (
  dateOfVisit,
  typeOfLivestock,
  herdId,
  previousClaims = [],
) =>
  previousClaims.filter(
    (prevClaim) =>
      new Date(prevClaim.data.dateOfVisit) <= new Date(dateOfVisit) &&
      prevClaim.type === claimConstants.claimType.review &&
      typeOfLivestock === prevClaim.data.typeOfLivestock &&
      (herdId ? herdId === prevClaim.herd?.id : true), // Only filtering on this if herdId is present, as we may not be on a MultiHerds journey
  );

export const getReviewWithinLast10Months = (
  dateOfVisit,
  previousClaims,
  vetVisitReview,
  typeOfLivestock,
  herdId,
) => {
  const pastReviewClaims = getPastReviewClaimsForSpeciesAndHerd(
    dateOfVisit,
    typeOfLivestock,
    herdId,
    previousClaims,
  );
  if (vetVisitReview?.data?.whichReview === typeOfLivestock) {
    pastReviewClaims.push({
      ...vetVisitReview,
      data: {
        ...vetVisitReview?.data,
        dateOfVisit: vetVisitReview?.data?.visitDate,
      },
    });
  }
  const pastReviewClaimsWithin10Months = pastReviewClaims?.filter((pastReviewClaim) =>
    areDatesWithin10Months(new Date(pastReviewClaim.data.dateOfVisit), new Date(dateOfVisit)),
  );
  return pastReviewClaimsWithin10Months?.[0];
};

export const getOldWorldClaimFromApplication = (oldWorldApp, typeOfLivestock) =>
  oldWorldApp && typeOfLivestock === oldWorldApp.data.whichReview
    ? {
        statusId: oldWorldApp.statusId,
        data: {
          claimType: oldWorldApp.data.whichReview,
          dateOfVisit: oldWorldApp.data.visitDate,
        },
      }
    : undefined;

export const getAllClaimsForFirstHerd = (
  previousClaims,
  typeOfLivestock,
  earliestClaimCanBePostMH = false,
) => {
  const prevLivestockClaims = previousClaims.filter(
    (claim) => claim.data.typeOfLivestock === typeOfLivestock,
  );

  const earliestClaim = previousClaims?.reduce((claim1, claim2) => {
    return new Date(claim1.createdAt) < new Date(claim2.createdAt) ? claim1 : claim2;
  }, {});

  let herdIdFromEarliestClaim;
  if (
    earliestClaim.data &&
    (earliestClaimCanBePostMH ||
      new Date(earliestClaim.data.dateOfVisit) < MULTIPLE_HERDS_RELEASE_DATE)
  ) {
    herdIdFromEarliestClaim = earliestClaim.data?.herdId || undefined;
  }

  return prevLivestockClaims.filter((claim) => claim.data.herdId === herdIdFromEarliestClaim);
};

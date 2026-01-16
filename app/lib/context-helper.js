import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
  clearEndemicsClaim,
} from "../session/index.js";
import { areDatesWithin10Months } from "./utils.js";
import { getApplicationsBySbi } from "../api-requests/application-api.js";
import { getClaimsByApplicationReference } from "../api-requests/claim-api.js";
import { createTempReference } from "./create-temp-ref.js";
import {
  MULTIPLE_HERDS_RELEASE_DATE,
  ONLY_HERD,
  PI_HUNT_AND_DAIRY_FOLLOW_UP_RELEASE_DATE,
  PIGS_AND_PAYMENTS_RELEASE_DATE,
} from "../constants/claim-constants.js";
import { claimRoutes } from "../constants/routes.js";
import { claimType } from "ffc-ahwr-common-library";

export async function refreshApplications(sbi, request) {
  const applications = await getApplicationsBySbi(sbi, request.logger);

  // get latest new world
  const latestEndemicsApplication = applications.find((application) => application.type === "EE");

  // get latest old world - if there isn't one, or it's not within 10 months of the new world one, then we won't consider it,
  // and thus return undefined
  const latestVetVisitApplication = applications.find((application) => {
    // endemics application must have been created within 10 months of vet-visit application visit date
    return (
      application.type === "VV" &&
      areDatesWithin10Months(application.data?.visitDate, latestEndemicsApplication.createdAt)
    );
  });

  await setSessionData(
    request,
    sessionEntryKeys.endemicsClaim,
    sessionKeys.endemicsClaim.latestVetVisitApplication,
    latestVetVisitApplication,
  );

  await setSessionData(
    request,
    sessionEntryKeys.endemicsClaim,
    sessionKeys.endemicsClaim.latestEndemicsApplication,
    latestEndemicsApplication,
  );

  return { latestEndemicsApplication, latestVetVisitApplication };
}

export async function refreshClaims(request, applicationRef) {
  const claims = await getClaimsByApplicationReference(applicationRef, request.logger);

  await setSessionData(
    request,
    sessionEntryKeys.endemicsClaim,
    sessionKeys.endemicsClaim.previousClaims,
    claims,
  );

  return claims;
}

export const resetEndemicsClaimSession = async (request, applicationRef, claimRef) => {
  const tempClaimRef = claimRef ?? createTempReference({ referenceForClaim: true });

  clearEndemicsClaim(request);
  await setSessionData(
    request,
    sessionEntryKeys.endemicsClaim,
    sessionKeys.endemicsClaim.reference,
    tempClaimRef,
  );
  await refreshClaims(request, applicationRef);
};

export function canChangeSpecies(request, typeOfReview) {
  const previousClaims = getSessionData(
    request,
    sessionEntryKeys.endemicsClaim,
    sessionKeys.endemicsClaim.previousClaims,
  );

  return claimType[typeOfReview] === claimType.review && !lockedToSpecies(previousClaims);
}

const lockedToSpecies = (previousEndemicClaims) => {
  // any endemic (new-world) claims means they have missed their opportunity to switch species
  return previousEndemicClaims && previousEndemicClaims.length > 0;
};

export const isVisitDateAfterPIHuntAndDairyGoLive = (dateOfVisit) => {
  const dateOfVisitParsed = new Date(dateOfVisit);
  if (Number.isNaN(dateOfVisitParsed.getTime())) {
    throw new Error(`dateOfVisit must be parsable as a date, value provided: ${dateOfVisit}`);
  }

  return dateOfVisitParsed >= PI_HUNT_AND_DAIRY_FOLLOW_UP_RELEASE_DATE;
};

export const isMultipleHerdsUserJourney = (dateOfVisit, agreementFlags) => {
  if (new Date(dateOfVisit) < MULTIPLE_HERDS_RELEASE_DATE) {
    return false;
  }

  // check for rejected T&Cs flag, if absent then is multiple herds journey
  return !agreementFlags?.some((f) => f.appliesToMh);
};

export const isPigsAndPaymentsUserJourney = (dateOfVisit) => {
  return new Date(dateOfVisit) >= PIGS_AND_PAYMENTS_RELEASE_DATE;
};

export const skipSameHerdPage = (previousClaims, typeOfLivestock) => {
  const previousClaimsForSpecies = previousClaims.filter((claim) => {
    return claim.data.typeOfLivestock === typeOfLivestock;
  });
  return (
    !previousClaimsForSpecies.length || previousClaimsForSpecies.some((claim) => claim.herd?.id)
  );
};

export const getHerdBackLink = (typeOfLivestock, previousClaims) => {
  return skipSameHerdPage(previousClaims, typeOfLivestock)
    ? claimRoutes.checkHerdDetails
    : claimRoutes.sameHerd;
};

export const skipOtherHerdsOnSbiPage = (existingHerds, selectedHerdId) => {
  const hasHerds = existingHerds?.length > 0;
  const hasReasonOnlyHerd = existingHerds?.some(
    (h) => h.id === selectedHerdId && h.reasons?.includes(ONLY_HERD),
  );

  return hasHerds && !hasReasonOnlyHerd;
};

export const getReviewHerdId = ({ herdId, tempHerdId }) =>
  herdId !== tempHerdId ? herdId : undefined;

export const isWithin4MonthsBeforeOrAfterDateOfVisit = (dateOfVisit, dateOfTesting) => {
  const AFTER_HOURS = 23;
  const AFTER_MINS = 59;
  const AFTER_SECONDS = 59;
  const AFTER_MILLIS = 999;
  const visitDate = new Date(dateOfVisit);
  const testingDate = new Date(dateOfTesting);

  if (Number.isNaN(visitDate) || Number.isNaN(testingDate)) {
    return false;
  }

  const fourMonthsBefore = new Date(visitDate);
  fourMonthsBefore.setMonth(visitDate.getMonth() - 4);
  fourMonthsBefore.setHours(0, 0, 0, 0);

  const fourMonthsAfter = new Date(visitDate);
  fourMonthsAfter.setMonth(visitDate.getMonth() + 4);
  fourMonthsAfter.setHours(AFTER_HOURS, AFTER_MINS, AFTER_SECONDS, AFTER_MILLIS);

  return testingDate >= fourMonthsBefore && testingDate <= fourMonthsAfter;
};

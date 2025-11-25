import { getReviewWithinLast10Months } from "./claim-helper.js";
import { getSessionData, setSessionData, sessionEntryKeys, sessionKeys } from "../session/index.js";
import { getLivestockTypes, isCows, getReviewType } from "./utils.js";
import { getReviewHerdId, isVisitDateAfterPIHuntAndDairyGoLive } from "./context-helper.js";
import { clearPiHuntSessionOnChange } from "./clear-pi-hunt-session-on-change.js";
import { claimRoutes } from "../constants/routes.js";

export const getNextMultipleHerdsPage = async (request) => {
  const {
    typeOfReview: typeOfClaim,
    previousClaims,
    latestVetVisitApplication: oldWorldApplication,
    typeOfLivestock,
    reviewTestResults,
    dateOfVisit,
    herdId,
    tempHerdId,
  } = getSessionData(request, sessionEntryKeys.endemicsClaim);

  const { isSheep } = getLivestockTypes(typeOfLivestock);
  const { isEndemicsFollowUp } = getReviewType(typeOfClaim);

  if (isEndemicsFollowUp) {
    const reviewHerdId = getReviewHerdId({ herdId, tempHerdId });
    const reviewWithinLast10Months = getReviewWithinLast10Months(
      dateOfVisit,
      previousClaims,
      oldWorldApplication,
      typeOfLivestock,
      reviewHerdId,
    );

    await setSessionData(
      request,
      sessionEntryKeys.endemicsClaim,
      sessionKeys.endemicsClaim.relevantReviewForEndemics,
      reviewWithinLast10Months,
    );

    if (!isSheep) {
      const piHuntEnabledAndVisitDateAfterGoLive =
        isVisitDateAfterPIHuntAndDairyGoLive(dateOfVisit);

      if (!piHuntEnabledAndVisitDateAfterGoLive) {
        clearPiHuntSessionOnChange(request, "dateOfVisit");
      }

      const reviewTestResultsValue =
        reviewTestResults ?? reviewWithinLast10Months?.data?.testResults;

      await setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.reviewTestResults,
        reviewTestResultsValue,
      );

      if (
        isCows(typeOfLivestock) &&
        (piHuntEnabledAndVisitDateAfterGoLive || reviewTestResultsValue === "negative")
      ) {
        return claimRoutes.speciesNumbers;
      }
    }
  }

  return claimRoutes.dateOfTesting;
};

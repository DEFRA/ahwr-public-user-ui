import { setSessionData, sessionEntryKeys, sessionKeys } from "../session/index.js";

const clearTestDetails = (request) => {
  setSessionData(
    request,
    sessionEntryKeys.endemicsClaim,
    sessionKeys.endemicsClaim.dateOfTesting,
    undefined,
  );
  setSessionData(
    request,
    sessionEntryKeys.endemicsClaim,
    sessionKeys.endemicsClaim.laboratoryURN,
    undefined,
  );
  setSessionData(
    request,
    sessionEntryKeys.endemicsClaim,
    sessionKeys.endemicsClaim.testResults,
    undefined,
  );
};

const clearPiHuntAllAnimals = (request) =>
  setSessionData(
    request,
    sessionEntryKeys.endemicsClaim,
    sessionKeys.endemicsClaim.piHuntAllAnimals,
    undefined,
  );

const clearPiHuntRecommended = (request) =>
  setSessionData(
    request,
    sessionEntryKeys.endemicsClaim,
    sessionKeys.endemicsClaim.piHuntRecommended,
    undefined,
  );

export function clearPiHuntSessionOnChange(request, piHuntStage) {
  switch (piHuntStage) {
    case "dateOfVisit":
      setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.piHunt,
        undefined,
      );
      clearPiHuntRecommended(request);
      clearPiHuntAllAnimals(request);
      clearTestDetails(request);
      break;
    case "piHunt":
      clearPiHuntRecommended(request);
      clearPiHuntAllAnimals(request);
      clearTestDetails(request);
      break;
    case "piHuntRecommended":
      clearPiHuntAllAnimals(request);
      clearTestDetails(request);
      break;
    case "piHuntAllAnimals":
      clearTestDetails(request);
      break;
    default:
      // No action needed otherwise
      break;
  }
}

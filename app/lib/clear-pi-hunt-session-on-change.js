import { setSessionData, sessionEntryKeys, sessionKeys } from "../session/index.js";

const clearTestDetails = async (request) => {
  await setSessionData(
    request,
    sessionEntryKeys.endemicsClaim,
    sessionKeys.endemicsClaim.dateOfTesting,
    undefined,
    { shouldEmitEvent: false },
  );
  await setSessionData(
    request,
    sessionEntryKeys.endemicsClaim,
    sessionKeys.endemicsClaim.laboratoryURN,
    undefined,
    { shouldEmitEvent: false },
  );
  await setSessionData(
    request,
    sessionEntryKeys.endemicsClaim,
    sessionKeys.endemicsClaim.testResults,
    undefined,
    { shouldEmitEvent: false },
  );
};

const clearPiHuntAllAnimals = async (request) =>
  await setSessionData(
    request,
    sessionEntryKeys.endemicsClaim,
    sessionKeys.endemicsClaim.piHuntAllAnimals,
    undefined,
    { shouldEmitEvent: false },
  );

const clearPiHuntRecommended = async (request) =>
  await setSessionData(
    request,
    sessionEntryKeys.endemicsClaim,
    sessionKeys.endemicsClaim.piHuntRecommended,
    undefined,
    { shouldEmitEvent: false },
  );

export async function clearPiHuntSessionOnChange(request, piHuntStage) {
  switch (piHuntStage) {
    case "dateOfVisit":
      await setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.piHunt,
        undefined,
        { shouldEmitEvent: false },
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

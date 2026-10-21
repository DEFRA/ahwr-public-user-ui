import { setSessionData, sessionEntryKeys, sessionKeys } from "../session/index.js";

const clearTestDetails = async (request) => {
  await Promise.allSettled([
    setSessionData(
      request,
      sessionEntryKeys.endemicsClaim,
      sessionKeys.endemicsClaim.dateOfTesting,
      undefined,
      { shouldEmitEvent: false },
    ),
    setSessionData(
      request,
      sessionEntryKeys.endemicsClaim,
      sessionKeys.endemicsClaim.laboratoryURN,
      undefined,
      { shouldEmitEvent: false },
    ),
    setSessionData(
      request,
      sessionEntryKeys.endemicsClaim,
      sessionKeys.endemicsClaim.testResults,
      undefined,
      { shouldEmitEvent: false },
    ),
  ]);
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
      await Promise.allSettled([
        setSessionData(
          request,
          sessionEntryKeys.endemicsClaim,
          sessionKeys.endemicsClaim.piHunt,
          undefined,
          { shouldEmitEvent: false },
        ),
        clearPiHuntRecommended(request),
        clearPiHuntAllAnimals(request),
        clearTestDetails(request),
      ]);
      break;
    case "piHunt":
      await Promise.allSettled([
        clearPiHuntRecommended(request),
        clearPiHuntAllAnimals(request),
        clearTestDetails(request),
      ]);
      break;
    case "piHuntRecommended":
      await Promise.allSettled([clearPiHuntAllAnimals(request), clearTestDetails(request)]);
      break;
    case "piHuntAllAnimals":
      await clearTestDetails(request);
      break;
    default:
      // No action needed otherwise
      break;
  }
}

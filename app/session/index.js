import { sendHerdEvent, sendSessionEvent } from "../messaging/session-event-emission.js";

export const sessionKeys = {
  farmerApplyData: {
    eligibleSpecies: "eligibleSpecies",
    declaration: "declaration",
    whichReview: "whichReview",
    confirmCheckDetails: "confirmCheckDetails",
    agreeSameSpecies: "agreeSameSpecies",
    agreeMultipleSpecies: "agreeMultipleSpecies",
    agreeSpeciesNumbers: "agreeSpeciesNumbers",
    agreeVisitTimings: "agreeVisitTimings",
    reference: "reference",
    offerStatus: "offerStatus",
    type: "type",
  },
  endemicsClaim: {
    vetsName: "vetsName",
    typeOfReview: "typeOfReview",
    dateOfVisit: "dateOfVisit",
    dateOfTesting: "dateOfTesting",
    vetRCVSNumber: "vetRCVSNumber",
    laboratoryURN: "laboratoryURN",
    numberAnimalsTested: "numberAnimalsTested",
    minimumNumberAnimalsRequired: "minimumNumberAnimalsRequired",
    biosecurity: "biosecurity",
    diseaseStatus: "diseaseStatus",
    reference: "reference",
    typeOfLivestock: "typeOfLivestock",
    herdVaccinationStatus: "herdVaccinationStatus",
    numberOfOralFluidSamples: "numberOfOralFluidSamples",
    numberOfSamplesTested: "numberOfSamplesTested",
    testResults: "testResults",
    vetVisitsReviewTestResults: "vetVisitsReviewTestResults",
    speciesNumbers: "speciesNumbers",
    sheepEndemicsPackage: "sheepEndemicsPackage",
    latestEndemicsApplication: "latestEndemicsApplication",
    latestVetVisitApplication: "latestVetVisitApplication",
    relevantReviewForEndemics: "relevantReviewForEndemics",
    sheepTests: "sheepTests",
    sheepTestResults: "sheepTestResults",
    previousClaims: "previousClaims",
    reviewTestResults: "reviewTestResults",
    piHunt: "piHunt",
    piHuntAllAnimals: "piHuntAllAnimals",
    piHuntRecommended: "piHuntRecommended",
    amount: "amount",
    tempHerdId: "tempHerdId",
    herdSelected: "herdSelected",
    herdId: "herdId",
    herdVersion: "herdVersion",
    herdName: "herdName",
    herdCph: "herdCph",
    isOnlyHerdOnSbi: "isOnlyHerdOnSbi",
    herdReasons: "herdReasons",
    herdSame: "herdSame",
    herds: "herds",
    pigsFollowUpTest: "pigsFollowUpTest",
    pigsElisaTestResult: "pigsElisaTestResult",
    pigsPcrTestResult: "pigsPcrTestResult",
    pigsGeneticSequencing: "pigsGeneticSequencing",
  },
  pkcecodes: {
    verifier: "verifier",
  },
  tokens: {
    idToken: "idToken",
    accessToken: "accessToken",
    refreshToken: "refreshToken",
    state: "state",
    nonce: "nonce",
  },
  customer: {
    id: "id",
    crn: "crn",
    organisationId: "organisationId",
    attachedToMultipleBusinesses: "attachedToMultipleBusinesses",
  },
  cannotSignInDetails: {
    error: "error",
    hasMultipleBusinesses: "hasMultipleBusinesses",
    backLink: "backLink",
    organisation: "organisation",
  },
};

// This object must always be in line with the above object.
// The only exception are the ones which are individual values,
// for example signInRedirect only stores a boolean, so it doesnt
// need an object defining above.
export const sessionEntryKeys = {
  farmerApplyData: "farmerApplyData",
  endemicsClaim: "endemicsClaim",
  pkcecodes: "pkcecodes",
  tokens: "tokens",
  customer: "customer",
  cannotSignInDetails: "cannotSignInDetails",
  signInRedirect: "signInRedirect",
  application: "application",
  organisation: "organisation",
};

// This function is used for setting individual values which are not in nested objects
export const setSessionEntry = async (
  request,
  entryKey,
  value,
  { shouldEmitEvent } = { shouldEmitEvent: true },
) => {
  if (!sessionEntryKeys[entryKey]) {
    throw new Error(
      `Session entry was attempted to be set with an entry key that doesnt exist: ${entryKey}.`,
    );
  }

  request.yar.set(entryKey, typeof value === "string" ? value.trim() : value);

  if (shouldEmitEvent) {
    await emitSessionEvent({ request, entryKey, key: entryKey, value });
  }
};

// This function is used for updating the nested objects in the session
export const setSessionData = async (
  request,
  entryKey,
  key,
  value,
  { shouldEmitEvent } = { shouldEmitEvent: true },
) => {
  if (!sessionEntryKeys[entryKey]) {
    throw new Error(
      `Session was attempted to be set with an entry key that doesnt exist: ${entryKey}.`,
    );
  }

  if (!key) {
    throw new Error(
      "setSessionData requires a key - use setSessionEntry for updating individual non-nested values",
    );
  }

  const entryValue = request.yar.get(entryKey) || {};
  entryValue[key] = typeof value === "string" ? value.trim() : value;
  request.yar.set(entryKey, entryValue);

  if (shouldEmitEvent) {
    await emitSessionEvent({ request, entryKey, key, value });
  }
};

export const getSessionData = (request, entryKey, key) => {
  if (!sessionEntryKeys[entryKey]) {
    throw new Error(
      `Session was attempted to be accessed with an entry key that doesnt exist: ${entryKey}.`,
    );
  }

  if (key) {
    if (typeof sessionKeys[entryKey] === "object" && !sessionKeys[entryKey][key]) {
      throw new Error(
        `Session was attempted to be accessed with an inner key that doesnt exist: ${key}.`,
      );
    }

    return request.yar.get(entryKey)?.[key];
  }

  return request.yar.get(entryKey);
};

export function clearAllOfSession(request) {
  Object.keys(sessionEntryKeys).forEach((value) => request.yar.clear(value));
}

export function clearApplyRedirect(request) {
  request.yar.clear(sessionEntryKeys.signInRedirect);
}

export function clearEndemicsClaim(request) {
  const endemicsClaim = getSessionData(request, sessionEntryKeys.endemicsClaim);
  const organisation = getSessionData(request, sessionEntryKeys.organisation);

  const retained = {
    [sessionKeys.endemicsClaim.organisation]: organisation,
    [sessionKeys.endemicsClaim.latestVetVisitApplication]: endemicsClaim?.latestVetVisitApplication,
    [sessionKeys.endemicsClaim.latestEndemicsApplication]: endemicsClaim?.latestEndemicsApplication,
  };

  request.yar.set(sessionEntryKeys.endemicsClaim, retained);
}

export const removeMultipleHerdsSessionData = (request) => {
  const endemicsClaimSession = getSessionData(request, sessionEntryKeys.endemicsClaim);

  const partlyClearedSession = {
    ...endemicsClaimSession,
    [sessionKeys.endemicsClaim.tempHerdId]: undefined,
    [sessionKeys.endemicsClaim.herdId]: undefined,
    [sessionKeys.endemicsClaim.herdName]: undefined,
    [sessionKeys.endemicsClaim.herdCph]: undefined,
    [sessionKeys.endemicsClaim.isOnlyHerdOnSbi]: undefined,
    [sessionKeys.endemicsClaim.herdReasons]: undefined,
    [sessionKeys.endemicsClaim.herdSame]: undefined,
  };

  request.yar.set(sessionEntryKeys.endemicsClaim, partlyClearedSession);
};

export function removeSessionDataForSelectHerdChange(request) {
  const endClSession = getSessionData(request, sessionEntryKeys.endemicsClaim);
  const organisation = getSessionData(request, sessionEntryKeys.organisation);

  request.yar.clear(sessionEntryKeys.endemicsClaim);

  const endemicsSessionKeys = sessionKeys.endemicsClaim;

  const remadeSession = {
    [endemicsSessionKeys.organisation]: organisation,
    [endemicsSessionKeys.latestVetVisitApplication]: endClSession?.latestVetVisitApplication,
    [endemicsSessionKeys.latestEndemicsApplication]: endClSession?.latestEndemicsApplication,
    [endemicsSessionKeys.previousClaims]: endClSession?.previousClaims,
    [endemicsSessionKeys.reference]: endClSession?.reference,
    [endemicsSessionKeys.typeOfLivestock]: endClSession?.typeOfLivestock,
    [endemicsSessionKeys.typeOfReview]: endClSession?.typeOfReview,
    [endemicsSessionKeys.dateOfVisit]: endClSession?.dateOfVisit,
    [endemicsSessionKeys.tempHerdId]: endClSession?.tempHerdId,
    [endemicsSessionKeys.herds]: endClSession?.herds,
    [endemicsSessionKeys.vetVisitsReviewTestResults]: endClSession?.vetVisitsReviewTestResults,
  };

  request.yar.set(sessionEntryKeys.endemicsClaim, remadeSession);

  return { originalSession: endClSession, remadeSession };
}

export function removeSessionDataForSameHerdChange(request) {
  const { originalSession, remadeSession } = removeSessionDataForSelectHerdChange(request);

  const endemicsSessionKeys = sessionKeys.endemicsClaim;

  const furtherRemadeSession = {
    ...remadeSession,
    [endemicsSessionKeys.herdId]: originalSession?.herdId,
    [endemicsSessionKeys.herdVersion]: originalSession?.herdVersion,
    [endemicsSessionKeys.herdName]: originalSession?.herdName,
    [endemicsSessionKeys.herdCph]: originalSession?.herdCph,
    [endemicsSessionKeys.isOnlyHerdOnSbi]: originalSession?.isOnlyHerdOnSbi,
    [endemicsSessionKeys.herdReasons]: originalSession?.herdReasons,
  };

  request.yar.set(sessionEntryKeys.endemicsClaim, furtherRemadeSession);
}

export const emitSessionEvent = async ({ request, entryKey, key, value }) => {
  const farmerApplyData = getSessionData(request, sessionEntryKeys.farmerApplyData);
  const claimData = getSessionData(request, sessionEntryKeys.endemicsClaim);
  const organisation = getSessionData(request, sessionEntryKeys.organisation);
  const sessionId = request.yar.id;

  if (!organisation) {
    return;
  }

  if (entryKey === sessionEntryKeys.farmerApplyData) {
    // user is in apply journey
    await sendSessionEvent({
      id: sessionId,
      sbi: organisation.sbi,
      email: organisation.email,
      journey: "farmerApplyData",
      sessionKey: key,
      value,
      claimReference: claimData?.reference ?? "N/A",
      applicationReference: farmerApplyData?.reference ?? "N/A",
    });

    return;
  }

  if (entryKey === sessionEntryKeys.endemicsClaim) {
    // user is in claim journey
    await sendSessionEvent({
      id: sessionId,
      sbi: organisation.sbi,
      email: organisation.email,
      journey: "claim",
      sessionKey: key,
      value,
      claimReference: claimData?.reference ?? "N/A",
      applicationReference: farmerApplyData?.reference ?? "N/A",
    });

    return;
  }

  // user is logging in
  await sendSessionEvent({
    id: sessionId,
    sbi: organisation.sbi,
    email: organisation.email,
    journey: entryKey,
    sessionKey: key ?? entryKey,
    value,
    claimReference: claimData?.reference ?? "N/A",
    applicationReference: farmerApplyData?.reference ?? "N/A",
  });
};

export const emitHerdEvent = async ({ request, type, message, data }) => {
  const organisation = getSessionData(request, sessionEntryKeys.organisation);
  const sessionId = request.yar.id;
  const { sbi, email } = organisation;

  await sendHerdEvent({ sbi, email, sessionId, type, message, data });
};

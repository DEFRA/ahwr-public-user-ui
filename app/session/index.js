export const sessionKeys = {
  farmerApplyData: {
    eligibleSpecies: "eligibleSpecies",
    declaration: "declaration",
    organisation: "organisation",
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
    organisation: "organisation",
    vetsName: "vetsName",
    testResult: "testResult",
    typeOfReview: "livestock",
    dateOfVisit: "dateOfVisit",
    dateOfTesting: "dateOfTesting",
    vetRCVSNumber: "vetRCVSNumber",
    laboratoryURN: "laboratoryURN",
    numberAnimalsTested: "numberAnimalsTested",
    minimumNumberAnimalsRequired: "minimumNumberAnimalsRequired",
    LatestEndemicsApplicationReference: "LatestEndemicsApplicationReference",
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
  signInRedirect: "signInRedirect",
  application: "application",
  tempReference: "tempReference",
};

// This object must always be in line with the above object.
// The outer keys must always match. Unit tests make sure of this.
export const sessionEntryKeys = {
  farmerApplyData: "farmerApplyData",
  endemicsClaim: "endemicsClaim",
  pkcecodes: "pkcecodes",
  tokens: "tokens",
  customer: "customer",
  cannotSignInDetails: "cannotSignInDetails",
  signInRedirect: "signInRedirect",
  application: "application",
  tempReference: "tempReference",
};

export const setSessionData = (request, entryKey, key, value) => {
  if (!sessionEntryKeys[entryKey]) {
    throw new Error(
      `Session was attempted to be set with an entry key that doesnt exist: ${entryKey}.`,
    );
  }
  const entryValue = request.yar.get(entryKey) || {};
  entryValue[key] = typeof value === "string" ? value.trim() : value;
  request.yar.set(entryKey, entryValue);
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

export const entries = {
  application: "application",
  endemicsClaim: "endemicsClaim",
  farmerApplyData: "farmerApplyData",
  selectYourBusiness: "selectYourBusiness",
  organisation: "organisation",
  answers: "answers",
  pkcecodes: "pkcecodes",
  tokens: "tokens",
  customer: "customer",
  cannotSignInDetails: "cannotSignInDetails",
  signInRedirect: "signInRedirect",
};

const setSessionData = (request, entryKey, key, value) => {
  const entryValue = request.yar.get(entryKey) || {};
  entryValue[key] = typeof value === "string" ? value.trim() : value;
  request.yar.set(entryKey, entryValue);
}

const getSessionData = (request, entryKey, key) => {
  return key ? request.yar.get(entryKey)?.[key] : request.yar.get(entryKey);
}

export function clearAllOfSession(request) {
  Object.values(entries).forEach((value) => request.yar.clear(value));
}

export function setEndemicsClaim(request, key, value) {
  setSessionData(request, entries.endemicsClaim, key, value);
}

export function getEndemicsClaim(request, key) {
  return getSessionData(request, entries.endemicsClaim, key);
}

export function setFarmerApplyData(request, key, value) {
  setSessionData(request, entries.farmerApplyData, key, value);
}

export function getFarmerApplyData(request, key) {
  return getSessionData(request, entries.farmerApplyData, key);
}

export function setToken(request, key, value) {
  setSessionData(request, entries.tokens, key, value);
}

export function getToken(request, key) {
  return getSessionData(request, entries.tokens, key);
}

export function setPkcecodes(request, key, value) {
  setSessionData(request, entries.pkcecodes, key, value);
}

export function getPkcecodes(request, key) {
  return getSessionData(request, entries.pkcecodes, key);
}

export const setCustomer = (request, key, value) => {
  setSessionData(request, entries.customer, key, value);
};

export const getCustomer = (request, key) => {
  return getSessionData(request, entries.customer, key);
};

export const setCannotSignInDetails = (request, key, value) => {
  setSessionData(request, entries.cannotSignInDetails, key, value);
};

export const getCannotSignInDetails = (request, key) => {
  return getSessionData(request, entries.cannotSignInDetails, key);
};

export const setSignInRedirect = (request, key, value) => {
  setSessionData(request, entries.signInRedirect, key, value);
};

export const getSignInRedirect = (request, key) => {
  return getSessionData(request, entries.signInRedirect, key);
};

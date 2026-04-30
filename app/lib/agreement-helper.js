import { APPLICATION_REFERENCE_PREFIX_POULTRY } from "ffc-ahwr-common-library";

import { config } from "../config/index.js";
import { getSessionData, sessionEntryKeys, sessionKeys } from "../session/index.js";
import {
  applyRoutes,
  dashboardRoutes,
  poultryApplyRoutes,
  poultryClaimRoutes,
} from "../constants/routes.js";

export const checkIfPoultryAgreement = (latestEndemicsApplication) => {
  return (
    latestEndemicsApplication?.reference?.startsWith(APPLICATION_REFERENCE_PREFIX_POULTRY) &&
    config.poultry.enabled
  );
};

const userHasLivestockAgreement = (request) => {
  // Technically, this should never happen, because of redirection plugin.
  if (request.path === applyRoutes.declaration && request.method === "get") {
    return false;
  }

  const latestEndemicsApplication = getSessionData(
    request,
    sessionEntryKeys.endemicsClaim,
    sessionKeys.endemicsClaim.latestEndemicsApplication,
  );
  return latestEndemicsApplication?.status === "AGREED";
};

const userHasPoultryAgreement = (request) => {
  // Technically, this should never happen, because of redirection plugin.
  if (request.path === poultryApplyRoutes.declaration && request.method === "get") {
    return false;
  }

  const latestPoultryApplication = getSessionData(
    request,
    sessionEntryKeys.poultryClaim,
    sessionKeys.poultryClaim.latestPoultryApplication,
  );
  return latestPoultryApplication?.status === "AGREED";
};

export const shouldShowManageYourClaims = (request) => {
  const hiddenPaths = [dashboardRoutes.checkDetails, dashboardRoutes.selectFunding];

  const poultryRoutes = [
    ...Object.values(poultryApplyRoutes),
    dashboardRoutes.poultryManageYourClaims,
    ...Object.values(poultryClaimRoutes),
  ];

  if (hiddenPaths.includes(request.path)) {
    return false;
  }

  if (poultryRoutes.includes(request.path)) {
    return userHasPoultryAgreement(request);
  }

  return userHasLivestockAgreement(request);
};

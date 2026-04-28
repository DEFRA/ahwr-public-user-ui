import { APPLICATION_REFERENCE_PREFIX_POULTRY } from "ffc-ahwr-common-library";

import { config } from "../config/index.js";
import { getSessionData, sessionEntryKeys, sessionKeys } from "../session/index.js";
import { dashboardRoutes, poultryApplyRoutes, poultryClaimRoutes } from "../constants/routes.js";

export const checkIfPoultryAgreement = (latestEndemicsApplication) => {
  return (
    latestEndemicsApplication?.reference?.startsWith(APPLICATION_REFERENCE_PREFIX_POULTRY) &&
    config.poultry.enabled
  );
};

const userHasLivestockAgreement = (request) => {
  const latestEndemicsApplication = getSessionData(
    request,
    sessionEntryKeys.endemicsClaim,
    sessionKeys.endemicsClaim.latestEndemicsApplication,
  );
  return latestEndemicsApplication?.status === "AGREED";
};

const userHasPoultryAgreement = (request) => {
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
    poultryApplyRoutes.confirmation,
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

import { APPLICATION_REFERENCE_PREFIX_POULTRY } from "ffc-ahwr-common-library";

import { config } from "../config/index.js";
import { getSessionData, sessionEntryKeys, sessionKeys } from "../session/index.js";
import { dashboardRoutes } from "../constants/routes.js";

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

export const shouldShowManageYourClaims = (request) => {
  const hiddenPaths = [dashboardRoutes.checkDetails, dashboardRoutes.selectFunding];

  if (hiddenPaths.includes(request.path)) {
    return false;
  }

  return userHasLivestockAgreement(request);
};

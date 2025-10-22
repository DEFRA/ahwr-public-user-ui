import { applicationType } from "../../constants/constants.js";
import { setSessionData, sessionEntryKeys, sessionKeys } from "../../session/index.js";
import { closedViewStatuses } from "ffc-ahwr-common-library";

export function getRedirectPath(applicationsForSbi, request) {
  const checkDetails = "/check-details";

  if (applicationsForSbi.length === 0) {
    setSessionData(request, sessionEntryKeys.signInRedirect, sessionKeys.signInRedirect, true);
    return { redirectPath: checkDetails, error: "" };
  }

  const latestApplication = applicationsForSbi[0];

  if (latestApplication.type === applicationType.ENDEMICS) {
    if (latestApplication.status === "AGREED") {
      return { redirectPath: checkDetails, error: "" };
    }

    setSessionData(request, sessionEntryKeys.signInRedirect, sessionKeys.signInRedirect, true);
    return { redirectPath: checkDetails, error: "" };
  }

  if (closedViewStatuses.includes(latestApplication.status)) {
    // User has claimed on their OW agreement, and needs a new world agreement.
    // Send to endemics apply journey
    setSessionData(request, sessionEntryKeys.signInRedirect, sessionKeys.signInRedirect, true);
    return { redirectPath: checkDetails, error: "" };
  }

  return { redirectPath: "", error: "ExpiredOldWorldApplication" };
}

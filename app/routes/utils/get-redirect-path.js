import { applicationType } from "../../constants/constants.js";
import { sessionEntryKeys, setSessionEntry } from "../../session/index.js";
import { closedViewStatuses } from "ffc-ahwr-common-library";

export async function getRedirectPath(applicationsForSbi, request) {
  const checkDetails = "/check-details";

  if (applicationsForSbi.length === 0) {
    await setSessionEntry(request, sessionEntryKeys.signInRedirect, true);
    return { redirectPath: checkDetails, error: "" };
  }

  const latestApplication = applicationsForSbi[0];

  if (latestApplication.type === applicationType.ENDEMICS) {
    if (latestApplication.status === "AGREED") {
      return { redirectPath: checkDetails, error: "" };
    }

    await setSessionEntry(request, sessionEntryKeys.signInRedirect, true);
    return { redirectPath: checkDetails, error: "" };
  }

  if (closedViewStatuses.includes(latestApplication.status)) {
    // User has claimed on their OW agreement, and needs a new world agreement.
    // Send to endemics apply journey
    await setSessionEntry(request, sessionEntryKeys.signInRedirect, true);
    return { redirectPath: checkDetails, error: "" };
  }

  return { redirectPath: "", error: "ExpiredOldWorldApplication" };
}

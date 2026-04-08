import { dashboardRoutes } from "../constants/routes.js";
import { getSessionData, sessionEntryKeys, sessionKeys } from "../session/index.js";
import { trackError } from "../logging/logger.js";

export const preApplyHandler = async (request, h) => {
  if (request.method === "get") {
    const organisation = getSessionData(request, sessionEntryKeys.organisation);

    if (!organisation) {
      throw new Error("No organisation found in session");
    }

    // Use latestEndemicsApplication from session (set during login by refreshApplications)
    // to stay consistent with select-funding.js and redirect-agreement-not-accepted plugin
    const latestEndemicsApplication = getSessionData(
      request,
      sessionEntryKeys.endemicsClaim,
      sessionKeys.endemicsClaim.latestEndemicsApplication,
    );

    if (latestEndemicsApplication?.status === "AGREED" && !latestEndemicsApplication.redacted) {
      trackError(
        request.logger,
        new Error(
          "User attempted to use apply journey despite already having an agreed agreement.",
        ),
        "user-action",
        "User attempted to use apply journey despite already having an agreed agreement.",
      );

      return h.redirect(dashboardRoutes.manageYourClaims).takeover();
    }
  }

  return h.continue;
};

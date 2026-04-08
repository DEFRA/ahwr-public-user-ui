import { dashboardRoutes } from "../constants/routes.js";
import {
  getSessionData,
  sessionEntryKeys,
  sessionKeys,
  setSessionEntry,
} from "../session/index.js";
import { trackError } from "../logging/logger.js";
import { getApplicationsBySbi } from "../api-requests/application-api.js";
import { applicationType, JOURNEY } from "../constants/constants.js";

export const preApplyHandler = async (request, h) => {
  if (request.method === "get") {
    const organisation = getSessionData(request, sessionEntryKeys.organisation);

    if (!organisation) {
      throw new Error("No organisation found in session");
    }

    // Use latestEndemicsApplication from session (set during login by refreshApplications)
    // to stay consistent with select-funding.js and redirect-agreement-not-accepted plugin.
    // But we leave for now application as it generates a event for the MI report
    const latestEndemicsApplication = getSessionData(
      request,
      sessionEntryKeys.endemicsClaim,
      sessionKeys.endemicsClaim.latestEndemicsApplication,
    );

    await generateApplicationEvent(request, organisation);

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

async function generateApplicationEvent(request, organisation) {
  let application = getSessionData(request, sessionEntryKeys.application);
  if (!application) {
    const latestApplications = await getApplicationsBySbi(organisation.sbi);
    const newWorldApplications = latestApplications.filter(
      (newWorldApp) => newWorldApp.type === applicationType.ENDEMICS,
    );
    application = newWorldApplications.length ? newWorldApplications[0] : null;
    await setSessionEntry(request, sessionEntryKeys.application, application, {
      journey: JOURNEY.APPLY,
    });
  }
}

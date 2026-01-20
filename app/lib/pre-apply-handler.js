import { getApplicationsBySbi } from "../api-requests/application-api.js";
import { applicationType, JOURNEY } from "../constants/constants.js";
import { dashboardRoutes } from "../constants/routes.js";
import { getSessionData, sessionEntryKeys, setSessionEntry } from "../session/index.js";
import { trackError } from "../logging/logger.js";

export const preApplyHandler = async (request, h) => {
  if (request.method === "get") {
    const organisation = getSessionData(request, sessionEntryKeys.organisation);

    if (!organisation) {
      throw new Error("No organisation found in session");
    }

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

    // TODO - find an alternative to setBindings
    request.logger.setBindings({ sbi: organisation.sbi });

    if (application?.status === "AGREED" && !application.redacted) {
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

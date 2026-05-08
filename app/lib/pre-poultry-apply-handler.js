import { getApplicationsBySbi } from "../api-requests/application-api.js";
import { JOURNEY } from "../constants/constants.js";
import { dashboardRoutes } from "../constants/routes.js";
import { getSessionData, sessionEntryKeys, setSessionEntry } from "../session/index.js";
import { trackError } from "../logging/logger.js";
import { APPLICATION_REFERENCE_PREFIX_POULTRY } from "ffc-ahwr-common-library";

export const prePoultryApplyHandler = async (request, h) => {
  if (request.method === "get") {
    const organisation = getSessionData(request, sessionEntryKeys.organisation);

    if (!organisation) {
      throw new Error("No organisation found in session");
    }

    let application = getSessionData(request, sessionEntryKeys.application);

    if (!application || !application.reference.startsWith(APPLICATION_REFERENCE_PREFIX_POULTRY)) {
      const latestApplications = await getApplicationsBySbi(organisation.sbi);
      const poultryApplications = latestApplications.filter((app) =>
        app.reference.startsWith(APPLICATION_REFERENCE_PREFIX_POULTRY),
      );
      application = poultryApplications.length ? poultryApplications[0] : null;
      await setSessionEntry(request, sessionEntryKeys.application, application, {
        journey: JOURNEY.APPLY,
      });
    }

    if (application?.status === "AGREED" && !application.redacted) {
      trackError(
        request.logger,
        new Error(
          "User attempted to use apply journey despite already having an agreed agreement.",
        ),
        "user-action",
        "User attempted to use apply journey despite already having an agreed agreement.",
      );

      return h.redirect(dashboardRoutes.poultryManageYourClaims).takeover();
    }
  }

  return h.continue;
};

import { getApplicationsBySbi } from "../api-requests/application-api.js";
import { applicationType } from "../constants/constants.js";
import { dashboardRoutes } from "../constants/routes.js";
import {
  getSessionData,
  sessionEntryKeys,
  sessionKeys,
  setSessionEntry,
} from "../session/index.js";

export const preApplyHandler = async (request, h) => {
  if (request.method === "get") {
    const organisation = getSessionData(
      request,
      sessionEntryKeys.farmerApplyData,
      sessionKeys.farmerApplyData.organisation,
    );

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
      setSessionEntry(request, sessionEntryKeys.application, application);
    }

    request.logger.setBindings({ sbi: organisation.sbi });

    if (application?.status === "AGREED" && !application.redacted) {
      // TODO - event needs tracking here
      request.logger.setBindings({
        err: "User attempted to use apply journey despite already having an agreed agreement.",
      });
      return h.redirect(dashboardRoutes.manageYourClaims).takeover();
    }
  }

  return h.continue;
};

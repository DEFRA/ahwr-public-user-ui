import { getApplicationsBySbi } from "../api-requests/application-api.js";
import { applicationType } from "../constants/constants.js";
import { getSessionData, setSessionData, sessionEntryKeys, sessionKeys } from "../session/index.js";

export const preApplyHandler = async (request, h) => {
  if (request.method === "get") {
    const organisation = getSessionData(
      request,
      sessionEntryKeys.farmerApplyData,
      sessionKeys.farmerApplyData.organisation,
    );

    let application = getSessionData(request, sessionEntryKeys.farmerApplyData);

    if (!application) {
      const latestApplications = await getApplicationsBySbi(organisation.sbi);
      const newWorldApplications = latestApplications.filter(
        (newWorldApp) => newWorldApp.type === applicationType.ENDEMICS,
      );
      application = newWorldApplications.length ? newWorldApplications[0] : null;
      setSessionData(request, sessionEntryKeys.application, sessionKeys.application, application);
    }

    request.logger.setBindings({ sbi: organisation.sbi });

    if (application?.status === "AGREED" && !application.applicationRedacts.length) {
      throw new Error(
        "User attempted to use apply journey despite already having an agreed agreement.",
      );
    }
  }

  return h.continue;
};

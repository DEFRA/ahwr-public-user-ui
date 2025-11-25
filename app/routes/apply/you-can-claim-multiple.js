import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
  setSessionEntry,
} from "../../session/index.js";
import { applyRoutes, applyViews, dashboardRoutes } from "../../constants/routes.js";
import { createTempReference } from "../../lib/create-temp-ref.js";
import { getUserTypeByApplication } from "../../lib/get-user-type-by-application.js";
import { getApplicationsBySbi } from "../../api-requests/application-api.js";
import { preApplyHandler } from "../../lib/pre-apply-handler.js";

export const claimMultipleRouteHandlers = [
  {
    method: "GET",
    path: "/you-can-claim-multiple",
    options: {
      pre: [{ method: preApplyHandler }],
      handler: async (request, h) => {
        // on way in we must generate a new reference
        const tempApplicationId = createTempReference();

        await setSessionData(
          request,
          sessionEntryKeys.farmerApplyData,
          sessionKeys.farmerApplyData.reference,
          tempApplicationId,
        );

        const organisation = getSessionData(request, sessionEntryKeys.organisation);

        request.logger.setBindings({ sbi: organisation.sbi });

        const latestApplications = await getApplicationsBySbi(organisation.sbi);

        const userType = getUserTypeByApplication(latestApplications);

        await setSessionEntry(request, sessionEntryKeys.organisation, {
          ...organisation,
          userType,
        });

        return h.view(applyViews.youCanClaimMultiple, {
          backLink: dashboardRoutes.checkDetails,
          organisation,
        });
      },
    },
  },
  {
    method: "POST",
    path: "/you-can-claim-multiple",
    options: {
      handler: async (request, h) => {
        if (request.payload.agreementStatus === "agree") {
          await setSessionData(
            request,
            sessionEntryKeys.farmerApplyData,
            sessionKeys.farmerApplyData.agreeMultipleSpecies,
            "yes",
          );

          return h.redirect(applyRoutes.numbers);
        }

        await setSessionData(
          request,
          sessionEntryKeys.farmerApplyData,
          sessionKeys.farmerApplyData.agreeMultipleSpecies,
          "no",
        );

        return h.view(applyViews.offerRejected, {
          termsRejected: true,
        });
      },
    },
  },
];

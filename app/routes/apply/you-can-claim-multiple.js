import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../session/index.js";
import { applyRoutes, applyViews, dashboardRoutes } from "../../config/routes.js";
import { createTempAgreementReference } from "../../lib/create-temp-agreeement-ref.js";
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
        const tempApplicationId = createTempAgreementReference();

        setSessionData(
          request,
          sessionEntryKeys.farmerApplyData,
          sessionKeys.farmerApplyData.reference,
          tempApplicationId,
        );

        const organisation = getSessionData(
          request,
          sessionEntryKeys.farmerApplyData,
          sessionKeys.farmerApplyData.organisation,
        );

        request.logger.setBindings({ sbi: organisation.sbi });

        const latestApplications = await getApplicationsBySbi(organisation.sbi);

        const userType = getUserTypeByApplication(latestApplications);

        setSessionData(
          request,
          sessionEntryKeys.farmerApplyData,
          sessionKeys.farmerApplyData.organisation,
          {
            ...organisation,
            userType,
          },
        );

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
          setSessionData(
            request,
            sessionEntryKeys.farmerApplyData,
            sessionKeys.farmerApplyData.agreeMultipleSpecies,
            "yes",
          );

          return h.redirect(applyRoutes.numbers);
        }

        setSessionData(
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

import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
  setSessionEntry,
} from "../../../session/index.js";
import {
  dashboardRoutes,
  poultryApplyRoutes,
  poultryApplyViews,
} from "../../../constants/routes.js";
import { createTempReference } from "../../../lib/create-temp-ref.js";
import { getUserTypeByApplication } from "../../../lib/get-user-type-by-application.js";
import { getApplicationsBySbi } from "../../../api-requests/application-api.js";
import { JOURNEY } from "../../../constants/constants.js";

export const poultryClaimMultipleRouteHandlers = [
  {
    method: "GET",
    path: "/poultry/you-can-claim-multiple",
    options: {
      handler: async (request, h) => {
        // on way in we must generate a new reference
        const tempApplicationId = createTempReference({ referenceForClaim: false });

        await setSessionData(
          request,
          sessionEntryKeys.poultryApplyData,
          sessionKeys.poultryApplyData.reference,
          tempApplicationId,
        );

        const organisation = getSessionData(request, sessionEntryKeys.organisation);

        const latestApplications = await getApplicationsBySbi(organisation.sbi, request.logger);

        const userType = getUserTypeByApplication(latestApplications);

        await setSessionEntry(
          request,
          sessionEntryKeys.organisation,
          {
            ...organisation,
            userType,
          },
          { journey: JOURNEY.APPLY },
        );

        return h.view(poultryApplyViews.youCanClaimMultiple, {
          backLink: dashboardRoutes.selectFunding,
          organisation,
        });
      },
    },
  },
  {
    method: "POST",
    path: "/poultry/you-can-claim-multiple",
    options: {
      handler: async (request, h) => {
        if (request.payload.agreementStatus === "agree") {
          await setSessionData(
            request,
            sessionEntryKeys.poultryApplyData,
            sessionKeys.poultryApplyData.agreeMultipleSpecies,
            "yes",
          );

          return h.redirect(poultryApplyRoutes.numbers);
        }

        await setSessionData(
          request,
          sessionEntryKeys.poultryApplyData,
          sessionKeys.poultryApplyData.agreeMultipleSpecies,
          "no",
        );

        return h.view(poultryApplyViews.offerRejected, {
          termsRejected: true,
        });
      },
    },
  },
];

import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../../session/index.js";
import { poultryApplyRoutes, poultryApplyViews } from "../../../constants/routes.js";
import { prePoultryApplyHandler } from "../../../lib/pre-poultry-apply-handler.js";

export const poultryNumbersRouteHandlers = [
  {
    method: "GET",
    path: poultryApplyRoutes.minimumNumber,
    options: {
      pre: [{ method: prePoultryApplyHandler }],
      handler: async (request, h) => {
        const backLink = poultryApplyRoutes.whatYouCanClaim;
        const organisation = getSessionData(request, sessionEntryKeys.organisation);

        return h.view(poultryApplyViews.minimumNumber, {
          backLink,
          organisation,
        });
      },
    },
  },
  {
    method: "POST",
    path: poultryApplyRoutes.minimumNumber,
    options: {
      handler: async (request, h) => {
        if (request.payload.agreementStatus === "agree") {
          await setSessionData(
            request,
            sessionEntryKeys.poultryApplyData,
            sessionKeys.poultryApplyData.agreeSpeciesNumbers,
            "yes",
          );

          return h.redirect(poultryApplyRoutes.timings);
        }

        await setSessionData(
          request,
          sessionEntryKeys.poultryApplyData,
          sessionKeys.poultryApplyData.agreeSpeciesNumbers,
          "no",
        );

        return h.view(poultryApplyViews.termsRejected, {
          backLink: poultryApplyRoutes.minimumNumber,
        });
      },
    },
  },
];

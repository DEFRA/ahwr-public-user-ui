import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../../session/index.js";
import { poultryApplyRoutes, poultryApplyViews } from "../../../constants/routes.js";
// import { preApplyHandler } from "../../../lib/pre-apply-handler.js";
// import { applicationType } from "../../../constants/constants.js";

export const poultryNumbersRouteHandlers = [
  {
    method: "GET",
    path: "/poultry/numbers",
    options: {
      // pre: [{ method: (request, h) => preApplyHandler(request, h, { type: applicationType.POULTRY }) }],
      handler: async (request, h) => {
        const backLink = poultryApplyRoutes.youCanClaimMultiple;
        const organisation = getSessionData(request, sessionEntryKeys.organisation);

        return h.view(poultryApplyViews.numbers, {
          backLink,
          organisation,
        });
      },
    },
  },
  {
    method: "POST",
    path: "/poultry/numbers",
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

        return h.view(poultryApplyViews.offerRejected, {
          termsRejected: true,
        });
      },
    },
  },
];

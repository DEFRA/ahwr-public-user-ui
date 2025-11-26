import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../session/index.js";
import { applyRoutes, applyViews } from "../../constants/routes.js";
import { preApplyHandler } from "../../lib/pre-apply-handler.js";

export const numbersRouteHandlers = [
  {
    method: "GET",
    path: "/numbers",
    options: {
      pre: [{ method: preApplyHandler }],
      handler: async (request, h) => {
        const backLink = applyRoutes.youCanClaimMultiple;
        const organisation = getSessionData(request, sessionEntryKeys.organisation);

        return h.view(applyViews.numbers, {
          backLink,
          organisation,
        });
      },
    },
  },
  {
    method: "POST",
    path: "/numbers",
    options: {
      handler: async (request, h) => {
        if (request.payload.agreementStatus === "agree") {
          await setSessionData(
            request,
            sessionEntryKeys.farmerApplyData,
            sessionKeys.farmerApplyData.agreeSpeciesNumbers,
            "yes",
          );

          return h.redirect(applyRoutes.timings);
        }

        await setSessionData(
          request,
          sessionEntryKeys.farmerApplyData,
          sessionKeys.farmerApplyData.agreeSpeciesNumbers,
          "no",
        );

        return h.view(applyViews.offerRejected, {
          termsRejected: true,
        });
      },
    },
  },
];

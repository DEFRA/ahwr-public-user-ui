import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../../session/index.js";
import { livestockApplyRoutes, livestockApplyViews } from "../../../constants/routes.js";
import { preApplyHandler } from "../../../lib/pre-apply-handler.js";

export const numbersRouteHandlers = [
  {
    method: "GET",
    path: livestockApplyRoutes.numbers,
    options: {
      pre: [{ method: preApplyHandler }],
      handler: async (request, h) => {
        const backLink = livestockApplyRoutes.youCanClaimMultiple;
        const organisation = getSessionData(request, sessionEntryKeys.organisation);

        return h.view(livestockApplyViews.numbers, {
          backLink,
          organisation,
        });
      },
    },
  },
  {
    method: "POST",
    path: livestockApplyRoutes.numbers,
    options: {
      handler: async (request, h) => {
        if (request.payload.agreementStatus === "agree") {
          await setSessionData(
            request,
            sessionEntryKeys.farmerApplyData,
            sessionKeys.farmerApplyData.agreeSpeciesNumbers,
            "yes",
          );

          return h.redirect(livestockApplyRoutes.timings);
        }

        await setSessionData(
          request,
          sessionEntryKeys.farmerApplyData,
          sessionKeys.farmerApplyData.agreeSpeciesNumbers,
          "no",
        );

        return h.view(livestockApplyViews.offerRejected, {
          termsRejected: true,
        });
      },
    },
  },
];

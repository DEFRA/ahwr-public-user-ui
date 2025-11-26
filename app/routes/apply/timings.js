import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../session/index.js";
import { userType } from "../../constants/constants.js";
import { applyRoutes, applyViews } from "../../constants/routes.js";
import { preApplyHandler } from "../../lib/pre-apply-handler.js";

export const timingsRouteHandlers = [
  {
    method: "GET",
    path: "/timings",
    options: {
      pre: [{ method: preApplyHandler }],
      handler: async (request, h) => {
        const organisation = getSessionData(request, sessionEntryKeys.organisation);
        const hasOldWorldApplication = organisation.userType !== userType.NEW_USER;

        return h.view(applyViews.timings, {
          hasOldWorldApplication,
          backLink: applyRoutes.numbers,
          organisation,
        });
      },
    },
  },
  {
    method: "POST",
    path: "/timings",
    options: {
      handler: async (request, h) => {
        if (request.payload.agreementStatus === "agree") {
          await setSessionData(
            request,
            sessionEntryKeys.farmerApplyData,
            sessionKeys.farmerApplyData.agreeVisitTimings,
            "yes",
          );

          return h.redirect(applyRoutes.declaration);
        }

        await setSessionData(
          request,
          sessionEntryKeys.farmerApplyData,
          sessionKeys.farmerApplyData.agreeVisitTimings,
          "no",
        );

        return h.view(applyViews.offerRejected, {
          termsRejected: true,
        });
      },
    },
  },
];

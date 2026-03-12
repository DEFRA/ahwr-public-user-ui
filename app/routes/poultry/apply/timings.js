import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../../session/index.js";
import { userType } from "../../../constants/constants.js";
import { poultryApplyRoutes, poultryApplyViews } from "../../../constants/routes.js";

export const poultryTimingsRouteHandlers = [
  {
    method: "GET",
    path: "/poultry/timings",
    options: {
      handler: async (request, h) => {
        const organisation = getSessionData(request, sessionEntryKeys.organisation);
        const hasOldWorldApplication = organisation.userType !== userType.NEW_USER;

        return h.view(poultryApplyViews.timings, {
          hasOldWorldApplication,
          backLink: poultryApplyRoutes.numbers,
          organisation,
        });
      },
    },
  },
  {
    method: "POST",
    path: "/poultry/timings",
    options: {
      handler: async (request, h) => {
        if (request.payload.agreementStatus === "agree") {
          await setSessionData(
            request,
            sessionEntryKeys.poultryApplyData,
            sessionKeys.poultryApplyData.agreeVisitTimings,
            "yes",
          );

          return h.redirect(poultryApplyRoutes.declaration);
        }

        await setSessionData(
          request,
          sessionEntryKeys.poultryApplyData,
          sessionKeys.poultryApplyData.agreeVisitTimings,
          "no",
        );

        return h.view(poultryApplyViews.offerRejected, {
          termsRejected: true,
        });
      },
    },
  },
];

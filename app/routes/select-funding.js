import { setSessionData, sessionEntryKeys, sessionKeys, getSessionData } from "../session/index.js";
import { applyRoutes, dashboardViews, poultryApplyRoutes } from "../constants/routes.js";

export const selectFundingRouteHandlers = [
  {
    method: "GET",
    path: "/select-funding",
    options: {
      handler: async (request, h) => {
        const organisation = getSessionData(request, sessionEntryKeys.organisation);

        const latestEndemicsApplication = getSessionData(
          request,
          sessionEntryKeys.endemicsClaim,
          sessionKeys.endemicsClaim.latestEndemicsApplication,
        );
        const latestPoultryApplication = getSessionData(
          request,
          sessionEntryKeys.poultryClaim,
          sessionKeys.poultryClaim.latestPoultryApplication,
        );
        const livestockText = latestEndemicsApplication
          ? `<b>Agreement number</b>: ${latestEndemicsApplication.reference}<br/>Create or manage claims for this agreement`
          : "Create an agreement for cattle, sheep and pig";

        const poultryText = latestPoultryApplication
          ? `<b>Agreement number</b>: ${latestPoultryApplication.reference}<br/>Create or manage claims for this agreement`
          : "Create an agreement for poultry biosecurity assessments";

        return h.view(dashboardViews.selectFunding, {
          livestockText,
          poultryText,
          ...organisation,
        });
      },
    },
  },
  {
    method: "POST",
    path: "/select-funding",
    options: {
      handler: async (request, h) => {
        const { type } = request.payload;

        await setSessionData(
          request,
          sessionEntryKeys.poultryApplyData,
          sessionKeys.poultryApplyData.type,
          type,
        );

        if (type === "IAHW") {
          return h.redirect(applyRoutes.youCanClaimMultiple);
        }

        return h.redirect(poultryApplyRoutes.youCanClaimMultiple);
      },
    },
  },
];

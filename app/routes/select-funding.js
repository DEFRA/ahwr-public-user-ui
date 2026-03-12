import { setSessionData, sessionEntryKeys, sessionKeys } from "../session/index.js";
import { applyRoutes, dashboardViews, poultryApplyRoutes } from "../constants/routes.js";

export const selectFundingRouteHandlers = [
  {
    method: "GET",
    path: "/select-funding",
    options: {
      handler: async (_, h) => {
        return h.view(dashboardViews.selectFunding);
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

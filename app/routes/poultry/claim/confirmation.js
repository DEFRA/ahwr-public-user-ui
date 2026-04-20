import { clearPoultryClaim, getSessionData, sessionEntryKeys } from "../../../session/index.js";
import { config } from "../../../config/index.js";
import { dashboardRoutes, poultryClaimViews } from "../../../constants/routes.js";

const { customerSurvey } = config;

const getHandler = {
  method: "GET",
  path: "/poultry/confirmation",
  options: {
    handler: async (request, h) => {
      const { reference, amount } = getSessionData(request, sessionEntryKeys.poultryClaim);

      clearPoultryClaim(request);

      return h.view(poultryClaimViews.confirmation, {
        claimDashboard: dashboardRoutes.poultryManageYourClaims,
        reference,
        amount,
        claimSurveyUri: customerSurvey.claimUri,
      });
    },
  },
};

export const poultryConfirmationHandlers = [getHandler];

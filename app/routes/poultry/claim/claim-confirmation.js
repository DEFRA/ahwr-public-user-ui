import { clearPoultryClaim, getSessionData, sessionEntryKeys } from "../../../session/index.js";
import { config } from "../../../config/index.js";
import {
  dashboardRoutes,
  poultryClaimRoutes,
  poultryClaimViews,
} from "../../../constants/routes.js";

const customerSurvey = config.get("customerSurvey");
const guidanceUri = config.get("poultry.guidanceUri");

const getHandler = {
  method: "GET",
  path: poultryClaimRoutes.claimConfirmation,
  options: {
    handler: async (request, h) => {
      const { reference, amount } = getSessionData(request, sessionEntryKeys.poultryClaim);

      clearPoultryClaim(request);

      return h.view(poultryClaimViews.claimConfirmation, {
        claimDashboard: dashboardRoutes.poultryManageClaims,
        reference,
        amount,
        claimSurveyUri: customerSurvey.claimUri,
        guidanceUri,
      });
    },
  },
};

export const poultryConfirmationHandlers = [getHandler];

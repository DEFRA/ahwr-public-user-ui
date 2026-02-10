import { clearEndemicsClaim, getSessionData, sessionEntryKeys } from "../../session/index.js";
import { config } from "../../config/index.js";
import { getReviewType } from "../../lib/utils.js";
import { claimViews, dashboardRoutes } from "../../constants/routes.js";

const { customerSurvey } = config;

const getHandler = {
  method: "GET",
  path: "/confirmation",
  options: {
    handler: async (request, h) => {
      const { reference, amount, typeOfReview } = getSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
      );
      // Create copies before clearing session
      const { isReview } = getReviewType(typeOfReview);

      clearEndemicsClaim(request);

      return h.view(claimViews.confirmation, {
        claimTypeText: isReview ? "animal health and welfare review" : "endemic disease follow-up",
        claimDashboard: dashboardRoutes.manageYourClaims,
        reference,
        amount,
        claimSurveyUri: customerSurvey.claimUri,
      });
    },
  },
};

export const confirmationHandlers = [getHandler];

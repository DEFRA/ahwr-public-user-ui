import { config } from "../config/index.js";
import { RPA_CONTACT_DETAILS } from "ffc-ahwr-common-library";
import { applyRoutes, dashboardRoutes } from "../constants/routes.js";
import { getSessionData, sessionEntryKeys, sessionKeys } from "../session/index.js";

const { serviceName, serviceUri, customerSurvey } = config;

export const viewContextPlugin = {
  plugin: {
    name: "view-context",
    register: (server, _) => {
      server.ext("onPreResponse", function (request, h) {
        const response = request.response;

        if (response.variety === "view") {
          const ctx = response.source.context || {};

          const { path, method } = request;

          let serviceUrl = "/";

          if (path.startsWith("/cookies")) {
            serviceUrl = "/cookies";
          }

          ctx.serviceName = serviceName;
          ctx.serviceUrl = serviceUrl;
          ctx.serviceUri = serviceUri;
          ctx.customerSurveyUri = getSurveyUri(request, path, method, customerSurvey);
          ctx.userIsSignedIn = request.auth.isAuthenticated;
          ctx.ruralPaymentsAgency = RPA_CONTACT_DETAILS;
          ctx.dashboardLink = dashboardRoutes.manageYourClaims;

          response.source.context = ctx;
        }

        return h.continue;
      });
    },
  },
};

function getSurveyUri(request, currentPath, currentMethod, customerSurvey) {
  if (currentPath === applyRoutes.declaration && currentMethod === "post") {
    return customerSurvey.applyUri;
  }
  return getSessionData(request, sessionEntryKeys.endemicsClaim, sessionKeys.endemicsClaim.latestEndemicsApplication) ? customerSurvey.claimUri : customerSurvey.applyUri;
}

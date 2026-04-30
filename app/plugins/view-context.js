import { config } from "../config/index.js";
import { POULTRY_SCHEME, RPA_CONTACT_DETAILS } from "ffc-ahwr-common-library";
import { dashboardRoutes } from "../constants/routes.js";
import { getScheme, getSurveyUri } from "../lib/context-helper.js";
import { shouldShowManageYourClaims } from "../lib/agreement-helper.js";

const { serviceName, serviceUri } = config;

export const viewContextPlugin = {
  plugin: {
    name: "view-context",
    register: (server, _) => {
      server.ext("onPreResponse", function (request, h) {
        const response = request.response;

        if (response.variety === "view") {
          const ctx = response.source.context || {};

          let serviceUrl = "/";

          if (request.path.startsWith("/cookies")) {
            serviceUrl = "/cookies";
          }

          ctx.serviceName = serviceName;
          ctx.serviceUrl = serviceUrl;
          ctx.serviceUri = serviceUri;
          ctx.customerSurveyUri = getSurveyUri(request);
          ctx.userIsSignedIn = request.auth.isAuthenticated;
          ctx.showManageYourClaims = shouldShowManageYourClaims(request);
          ctx.ruralPaymentsAgency = RPA_CONTACT_DETAILS;
          ctx.dashboardLink = dashboardRoutes.manageYourClaims;
          ctx.dashboardLink =
            getScheme(request) === POULTRY_SCHEME
              ? dashboardRoutes.poultryManageYourClaims
              : dashboardRoutes.manageYourClaims;

          response.source.context = ctx;
        }

        return h.continue;
      });
    },
  },
};

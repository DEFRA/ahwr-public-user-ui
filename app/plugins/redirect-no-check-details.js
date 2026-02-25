import { getSessionData, sessionEntryKeys, sessionKeys } from "../session/index.js";
import { dashboardRoutes } from "../constants/routes.js";

export const redirectNoCheckDetailsPlugin = {
  plugin: {
    name: "redirect-no-check-details",
    register: (server, _) => {
      server.ext("onPreHandler", (request, h) => {
        if (
          request.method === "get" &&
          !request.path.includes("sign-in") &&
          !request.path.includes("dev-landing-page") &&
          !request.path.includes("sign-out") &&
          !request.path.includes("cookies") &&
          !request.path.includes("signin-oidc") &&
          !request.path.includes("accessibility") &&
          !request.path.includes("missing-routes") &&
          !request.path.includes("vet-visits") &&
          !request.path.includes("check-details") &&
          !request.path.includes("update-details") &&
          !request.path.includes("dev-sign-in") &&
          !request.path.includes("assets") &&
          !request.path.includes("health") &&
          !request.path.includes("cannot-sign-in")
        ) {
          const confirmedDetails = getSessionData(
            request,
            sessionEntryKeys.confirmedDetails,
            sessionKeys.confirmedDetails,
          );

          if (!confirmedDetails) {
            return h.redirect(dashboardRoutes.checkDetails).takeover();
          }
        }
        return h.continue;
      });
    },
  },
};

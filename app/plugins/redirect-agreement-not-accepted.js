import { getSessionData, sessionEntryKeys, sessionKeys } from "../session/index.js";
import { dashboardRoutes } from "../constants/routes.js";

export const redirectAgreementNotAcceptedPlugin = {
  plugin: {
    name: "redirect-agreement-not-accepted",
    register: (server, _) => {
      server.ext("onPreHandler", (request, h) => {
        if (
          request.method === "get" &&
          !request.path.includes("sign-in") &&
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
          !request.path.includes("declaration") &&
          !request.path.includes("numbers") &&
          !request.path.includes("timings") &&
          !request.path.includes("you-can-claim-multiple") &&
          !request.path.includes("health") &&
          !request.path.includes("cannot-sign-in")
        ) {
          const latestEndemicsApplication = getSessionData(
            request,
            sessionEntryKeys.endemicsClaim,
            sessionKeys.endemicsClaim.latestEndemicsApplication,
          );

          if (latestEndemicsApplication?.status !== "AGREED") {
            return h.redirect(dashboardRoutes.manageYourClaims).takeover();
          }
        }
        return h.continue;
      });
    },
  },
};

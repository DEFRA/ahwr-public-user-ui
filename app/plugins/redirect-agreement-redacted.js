import { getSessionData, sessionEntryKeys, sessionKeys } from "../session/index.js";
import { dashboardRoutes } from "../constants/routes.js";

export const redirectAgreementRedactedPlugin = {
  plugin: {
    name: "redirect-agreement-redacted",
    register: (server, _) => {
      server.ext("onPreHandler", (request, h) => {
        if (
          request.method === "get" &&
          !request.path.includes("vet-visits") &&
          !request.path.includes("dev-sign-in") &&
          !request.path.includes("assets") &&
          !request.path.includes("declaration") &&
          !request.path.includes("numbers") &&
          !request.path.includes("timings") &&
          !request.path.includes("you-can-claim-multiple") &&
          !request.path.includes("health") &&
          !request.path.includes("connect") &&
          !request.path.includes("cannot-sign-in")
        ) {
          const latestEndemicsApplication = getSessionData(
            request,
            sessionEntryKeys.endemicsClaim,
            sessionKeys.endemicsClaim.latestEndemicsApplication,
          );

          if (latestEndemicsApplication?.redacted) {
            return h.redirect(dashboardRoutes.manageYourClaims).takeover();
          }
        }
        return h.continue;
      });
    },
  },
};

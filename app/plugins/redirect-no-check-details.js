import { getSessionData, sessionEntryKeys, sessionKeys } from "../session/index.js";
import {
  applyRoutes,
  claimRoutes,
  dashboardRoutes,
  signRoutes,
  supportRoutes,
} from "../constants/routes.js";

export const redirectNoCheckDetailsPlugin = {
  plugin: {
    name: "redirect-no-check-details",
    register: (server, _) => {
      const excludedPaths = [
        signRoutes.signIn,
        signRoutes.devLandingPage,
        signRoutes.signOut,
        signRoutes.signInOidc,
        signRoutes.cannotSignIn,
        supportRoutes.health,
        supportRoutes.accessibility,
        supportRoutes.missingRoutes,
        supportRoutes.assets,
        supportRoutes.updateDetails,
        supportRoutes.cookies,
        applyRoutes.checkDetails,
        claimRoutes.devSignIn,
      ];
      server.ext("onPreHandler", (request, h) => {
        const excludedPath = excludedPaths.some((term) => request.path.includes(term));
        if (request.method === "get" && !excludedPath) {
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

import { getSessionData, sessionEntryKeys, sessionKeys } from "../session/index.js";
import { applyRoutes, dashboardRoutes, loginRoutes, supportRoutes } from "../constants/routes.js";

export const redirectNoCheckDetailsPlugin = {
  plugin: {
    name: "redirect-no-check-details",
    register: (server, _) => {
      const excludedPaths = [
        loginRoutes.signIn,
        loginRoutes.devLandingPage,
        loginRoutes.devSignIn,
        loginRoutes.signOut,
        loginRoutes.signInOidc,
        loginRoutes.cannotSignIn,
        supportRoutes.health,
        supportRoutes.accessibility,
        supportRoutes.missingRoutes,
        supportRoutes.assets,
        supportRoutes.updateDetails,
        supportRoutes.cookies,
        applyRoutes.checkDetails,
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

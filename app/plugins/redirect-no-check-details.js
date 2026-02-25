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
      server.ext("onPreHandler", (request, h) => {
        if (
          request.method === "get" &&
          !request.path.includes(signRoutes.signIn) &&
          !request.path.includes(signRoutes.devLandingPage) &&
          !request.path.includes(signRoutes.signOut) &&
          !request.path.includes(signRoutes.signInOidc) &&
          !request.path.includes(signRoutes.cannotSignIn) &&
          !request.path.includes(supportRoutes.health) &&
          !request.path.includes(supportRoutes.accessibility) &&
          !request.path.includes(supportRoutes.missingRoutes) &&
          !request.path.includes(supportRoutes.health) &&
          !request.path.includes(supportRoutes.assets) &&
          !request.path.includes(supportRoutes.updateDetails) &&
          !request.path.includes(supportRoutes.cookies) &&
          !request.path.includes(applyRoutes.checkDetails) &&
          !request.path.includes(claimRoutes.devSignIn) &&
          !request.path.includes(dashboardRoutes.manageYourClaims)
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

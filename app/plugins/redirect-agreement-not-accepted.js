import { getSessionData, sessionEntryKeys, sessionKeys } from "../session/index.js";
import {
  applyRoutes,
  claimRoutes,
  dashboardRoutes,
  signRoutes,
  supportRoutes,
} from "../constants/routes.js";

export const redirectAgreementNotAcceptedPlugin = {
  plugin: {
    name: "redirect-agreement-not-accepted",
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
        applyRoutes.declaration,
        applyRoutes.numbers,
        applyRoutes.timings,
        applyRoutes.youCanClaimMultiple,
        claimRoutes.devSignIn,
        dashboardRoutes.manageYourClaims,
      ];
      server.ext("onPreHandler", (request, h) => {
        const excludedPath = excludedPaths.some((term) => request.path.includes(term));
        if (request.method === "get" && !excludedPath) {
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

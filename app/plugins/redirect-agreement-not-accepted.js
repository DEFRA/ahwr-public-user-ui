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
          !request.path.includes(applyRoutes.declaration) &&
          !request.path.includes(applyRoutes.numbers) &&
          !request.path.includes(applyRoutes.timings) &&
          !request.path.includes(applyRoutes.youCanClaimMultiple) &&
          !request.path.includes(claimRoutes.devSignIn) &&
          !request.path.includes(dashboardRoutes.manageYourClaims)
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

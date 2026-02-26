import { getSessionData, sessionEntryKeys, sessionKeys } from "../session/index.js";
import { applyRoutes, loginRoutes, supportRoutes } from "../constants/routes.js";

export const redirectAgreementNotAcceptedPlugin = {
  plugin: {
    name: "redirect-agreement-not-accepted",
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
        applyRoutes.declaration,
        applyRoutes.numbers,
        applyRoutes.timings,
        applyRoutes.youCanClaimMultiple,
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
            return h.redirect(applyRoutes.youCanClaimMultiple).takeover();
          }
        }
        return h.continue;
      });
    },
  },
};

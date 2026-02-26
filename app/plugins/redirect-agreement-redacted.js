import { getSessionData, sessionEntryKeys, sessionKeys } from "../session/index.js";
import { applyRoutes, dashboardRoutes, loginRoutes, supportRoutes } from "../constants/routes.js";

export const redirectAgreementRedactedPlugin = {
  plugin: {
    name: "redirect-agreement-redacted",
    register: (server, _) => {
      const excludedPaths = [
        loginRoutes.cannotSignIn,
        loginRoutes.devSignIn,
        supportRoutes.health,
        supportRoutes.assets,
        applyRoutes.declaration,
        applyRoutes.numbers,
        applyRoutes.timings,
        applyRoutes.youCanClaimMultiple,
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

          if (latestEndemicsApplication?.redacted) {
            return h.redirect(dashboardRoutes.manageYourClaims).takeover();
          }
        }
        return h.continue;
      });
    },
  },
};

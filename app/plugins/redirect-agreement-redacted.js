import { getSessionData, sessionEntryKeys, sessionKeys } from "../session/index.js";
import {
  livestockApplyRoutes,
  dashboardRoutes,
  loginRoutes,
  supportRoutes,
} from "../constants/routes.js";

export const redirectAgreementRedactedPlugin = {
  plugin: {
    name: "redirect-agreement-redacted",
    register: (server, _) => {
      const excludedPaths = [
        loginRoutes.cannotSignIn,
        supportRoutes.health,
        supportRoutes.assets,
        livestockApplyRoutes.declaration,
        livestockApplyRoutes.numbers,
        livestockApplyRoutes.timings,
        livestockApplyRoutes.youCanClaimMultiple,
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

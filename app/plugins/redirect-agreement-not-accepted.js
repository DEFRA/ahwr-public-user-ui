import { getSessionData, sessionEntryKeys, sessionKeys } from "../session/index.js";
import {
  livestockApplyRoutes,
  livestockClaimRoutes,
  dashboardRoutes,
} from "../constants/routes.js";

export const redirectAgreementNotAcceptedPlugin = {
  plugin: {
    name: "redirect-agreement-not-accepted",
    register: (server, _) => {
      const includedPaths = [
        dashboardRoutes.manageYourClaims,
        ...Object.values(livestockClaimRoutes),
      ];
      server.ext("onPreHandler", (request, h) => {
        if (request.path.startsWith("/poultry")) {
          return h.continue;
        }
        const includedPath = includedPaths.some((term) => request.path.includes(term));
        if (request.method === "get" && includedPath) {
          const latestEndemicsApplication = getSessionData(
            request,
            sessionEntryKeys.endemicsClaim,
            sessionKeys.endemicsClaim.latestEndemicsApplication,
          );

          if (latestEndemicsApplication?.status !== "AGREED") {
            return h.redirect(livestockApplyRoutes.youCanClaimMultiple).takeover();
          }
        }
        return h.continue;
      });
    },
  },
};

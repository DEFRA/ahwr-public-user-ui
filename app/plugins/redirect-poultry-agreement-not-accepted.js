import { getSessionData, sessionEntryKeys, sessionKeys } from "../session/index.js";
import { dashboardRoutes, poultryApplyRoutes, poultryClaimRoutes } from "../constants/routes.js";

export const redirectPoultryAgreementNotAcceptedPlugin = {
  plugin: {
    name: "redirect-poultry-agreement-not-accepted",
    register: (server, _) => {
      const includedPaths = [
        dashboardRoutes.poultryManageYourClaims,
        ...Object.values(poultryClaimRoutes),
      ];
      server.ext("onPreHandler", (request, h) => {
        const includedPath = includedPaths.some((term) => request.path.includes(term));
        if (request.method === "get" && includedPath) {
          const latestPoultryApplication = getSessionData(
            request,
            sessionEntryKeys.poultryClaim,
            sessionKeys.poultryClaim.latestPoultryApplication,
          );

          if (latestPoultryApplication?.status !== "AGREED") {
            return h.redirect(poultryApplyRoutes.youCanClaimMultiple).takeover();
          }
        }
        return h.continue;
      });
    },
  },
};

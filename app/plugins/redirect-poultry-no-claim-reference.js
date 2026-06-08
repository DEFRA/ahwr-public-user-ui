import { config } from "../config/index.js";
import { getSessionData, sessionEntryKeys, sessionKeys } from "../session/index.js";
import { dashboardRoutes, poultryClaimRoutes } from "../constants/routes.js";

const includedPaths = Object.values(poultryClaimRoutes).filter(
  (path) => path !== poultryClaimRoutes.dateOfVisit,
);

export const redirectPoultryNoClaimReferencePlugin = {
  plugin: {
    name: "redirect-poultry-no-claim-reference",
    register: (server) => {
      server.ext("onPreHandler", (request, h) => {
        if (!config.poultry.enabled || request.method !== "get") {
          return h.continue;
        }

        const isIncludedPath = includedPaths.some((term) => request.path.includes(term));

        if (!isIncludedPath) {
          return h.continue;
        }

        const claimReference = getSessionData(
          request,
          sessionEntryKeys.poultryClaim,
          sessionKeys.poultryClaim.reference,
        );

        if (!claimReference) {
          return h.redirect(dashboardRoutes.poultryManageYourClaims).takeover();
        }

        return h.continue;
      });
    },
  },
};

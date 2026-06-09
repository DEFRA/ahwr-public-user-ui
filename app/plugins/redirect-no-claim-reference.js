import { getSessionData, sessionEntryKeys, sessionKeys } from "../session/index.js";
import { dashboardRoutes, claimRoutes } from "../constants/routes.js";

const includedPaths = Object.values(claimRoutes).filter(
  (path) => path !== claimRoutes.whichSpecies,
);

export const redirectNoClaimReferencePlugin = {
  plugin: {
    name: "redirect-no-claim-reference",
    register: (server) => {
      server.ext("onPreHandler", (request, h) => {
        if (request.method !== "get") {
          return h.continue;
        }

        const isIncludedPath = includedPaths.some((path) => request?.path === path);

        if (!isIncludedPath) {
          return h.continue;
        }

        const claimReference = getSessionData(
          request,
          sessionEntryKeys.endemicsClaim,
          sessionKeys.endemicsClaim.reference,
        );

        if (!claimReference) {
          return h.redirect(dashboardRoutes.manageYourClaims).takeover();
        }

        return h.continue;
      });
    },
  },
};

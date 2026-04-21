import { poultryClaimRoutes, poultryClaimViews } from "../../../constants/routes.js";
import { getSessionData, sessionEntryKeys } from "../../../session/index.js";

const radioValueNewSite = "NEW_SITE";

const getUniqueSites = (previousClaims) => {
  if (!previousClaims) return [];

  const seen = new Set();
  return previousClaims
    .filter((claim) => claim.herd?.name && claim.herd?.cph)
    .filter((claim) => {
      const key = `${claim.herd.name}|${claim.herd.cph}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((claim) => ({
      id: claim.herd.id,
      name: claim.herd.name,
      cph: claim.herd.cph,
    }));
};

const getHandler = {
  method: "GET",
  path: poultryClaimRoutes.selectTheSite,
  handler: async (request, h) => {
    const { siteSelected, previousClaims } = getSessionData(request, sessionEntryKeys.poultryClaim);

    const previousSites = getUniqueSites(previousClaims);

    return h.view(poultryClaimViews.selectTheSite, {
      backLink: poultryClaimRoutes.dateOfReview,
      pageTitleText:
        previousSites.length > 1
          ? `Select the site you are claiming for`
          : `Is this the same site you have previously claimed for?`,
      sites: previousSites,
      radioValueNewSite,
      siteSelected,
    });
  },
};

const postHandler = {
  method: "POST",
  path: poultryClaimRoutes.selectTheSite,
  handler: async (_request, _h) => {},
};

export const poultrySelectTheSiteHandlers = [getHandler, postHandler];

import { poultryClaimRoutes, poultryClaimViews } from "../../../constants/routes.js";
import { getSessionData, sessionEntryKeys } from "../../../session/index.js";

const radioValueNewSite = "NEW_SITE";

const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

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
      species: claim.data?.typesOfPoultry,
      lastVisitDate: claim.data?.dateOfReview ? formatDate(claim.data.dateOfReview) : undefined,
      claimDate: claim.createdAt ? formatDate(claim.createdAt) : undefined,
    }));
};

const getHandler = {
  method: "GET",
  path: poultryClaimRoutes.selectTheSite,
  handler: async (request, h) => {
    const { siteSelected, previousClaims } = getSessionData(request, sessionEntryKeys.poultryClaim);

    const previousSites = getUniqueSites(previousClaims);

    if (previousSites.length > 1) {
      return h.view(poultryClaimViews.selectTheSite, {
        backLink: poultryClaimRoutes.dateOfReview,
        pageTitleText: `Select the site you are claiming for`,
        sites: previousSites,
        radioValueNewSite,
        siteSelected,
      });
    } else {
      const site = previousSites[0];
      return h.view(poultryClaimViews.selectTheSite, {
        backLink: poultryClaimRoutes.dateOfReview,
        pageTitleText: `Is this the same site you have previously claimed for?`,
        id: site?.id,
        name: site?.name,
        sites: previousSites,
        species: site?.species,
        lastVisitDate: site?.lastVisitDate,
        claimDate: site?.claimDate,
        cphNumber: site?.cph,
        radioValueNewSite,
        siteSelected,
      });
    }
  },
};

const postHandler = {
  method: "POST",
  path: poultryClaimRoutes.selectTheSite,
  handler: async (request, h) => {
    const { siteSelected } = request.payload;

    if (siteSelected === radioValueNewSite) {
      return h.redirect(poultryClaimRoutes.enterSiteName);
    }

    // TODO: Handle selecting an existing site
    return h.redirect(poultryClaimRoutes.enterSiteName);
  },
};

export const poultrySelectTheSiteHandlers = [getHandler, postHandler];

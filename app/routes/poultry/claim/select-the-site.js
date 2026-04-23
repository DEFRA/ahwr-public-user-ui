import { poultryClaimRoutes, poultryClaimViews } from "../../../constants/routes.js";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../../session/index.js";
import Joi from "joi";
import HttpStatus from "http-status-codes";
import { formatDate } from "../../../lib/display-helpers.js";
import { areDatesWithin10Months } from "../../../lib/utils.js";

const radioValueNewSite = "NEW_SITE";

const getUniqueSites = (previousClaims) => {
  if (!previousClaims) {
    return [];
  }

  const seen = new Set();
  return previousClaims
    .filter((claim) => claim.herd?.name && claim.herd?.cph)
    .filter((claim) => {
      const key = `${claim.herd.name}|${claim.herd.cph}`;
      if (seen.has(key)) {
        return false;
      }
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

    return h.view(poultryClaimViews.selectTheSite, {
      ...buildViewData(previousClaims),
      siteSelected,
    });
  },
};

const errorMessage = { text: "Select the site you are claiming for", href: "#siteSelected" };

const buildViewData = (previousClaims) => {
  const previousSites = getUniqueSites(previousClaims);

  if (previousSites.length > 1) {
    return {
      backLink: poultryClaimRoutes.dateOfReview,
      pageTitleText: "Select the site you are claiming for",
      sites: previousSites,
      radioValueNewSite,
    };
  }

  const site = previousSites[0];
  return {
    backLink: poultryClaimRoutes.dateOfReview,
    pageTitleText: "Is this the same site you have previously claimed for?",
    siteId: site?.id,
    name: site?.name,
    sites: previousSites,
    species: site?.species,
    lastVisitDate: site?.lastVisitDate,
    claimDate: site?.claimDate,
    cphNumber: site?.cph,
    radioValueNewSite,
  };
};

const postHandler = {
  method: "POST",
  path: poultryClaimRoutes.selectTheSite,
  options: {
    validate: {
      payload: Joi.object({
        siteSelected: Joi.string().required(),
      }),
      failAction: async (request, h, error) => {
        request.logger.error({ error });
        const { previousClaims } = getSessionData(request, sessionEntryKeys.poultryClaim);
        return h
          .view(poultryClaimViews.selectTheSite, {
            ...buildViewData(previousClaims),
            errorMessage,
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      },
    },
    handler: async (request, h) => {
      const { siteSelected } = request.payload;

      if (siteSelected === radioValueNewSite) {
        return h.redirect(poultryClaimRoutes.enterSiteName);
      }

      const { previousClaims, dateOfReview } = getSessionData(
        request,
        sessionEntryKeys.poultryClaim,
      );
      const sites = getUniqueSites(previousClaims);
      const selectedSite = sites.find((site) => site.id === siteSelected);

      const previousClaimForSite = previousClaims?.find((claim) => claim.herd?.id === siteSelected);

      if (
        previousClaimForSite &&
        areDatesWithin10Months(dateOfReview, previousClaimForSite.data.dateOfReview)
      ) {
        return h
          .view(poultryClaimViews.cannotContinueTimingRules, {
            backLink: poultryClaimRoutes.selectTheSite,
            backToDateLink: poultryClaimRoutes.dateOfReview,
          })
          .code(HttpStatus.BAD_REQUEST);
      }

      await setSessionData(
        request,
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.tempSiteId,
        selectedSite.id,
      );
      await setSessionData(
        request,
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.herdName,
        selectedSite.name,
      );
      await setSessionData(
        request,
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.herdCph,
        selectedSite.cph,
      );

      await setSessionData(
        request,
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.isOnlyHerdOnSbi,
        "false",
        { shouldEmitEvent: false },
      );

      return h.redirect(poultryClaimRoutes.selectPoultryType);
    },
  },
};

export const poultrySelectTheSiteHandlers = [getHandler, postHandler];

import { poultryClaimRoutes, poultryClaimViews } from "../../../constants/routes.js";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../../session/index.js";
import Joi from "joi";
import HttpStatus from "http-status-codes";
import { formatDate, formatTypesOfPoultry } from "../../../lib/display-helpers.js";
import { areDatesWithin10Months } from "../../../lib/utils.js";
import { sendInvalidDataPoultryEvent } from "../../../messaging/ineligibility-event-emission.js";
import { config } from "../../../config/index.js";

const {
  poultry: { guidanceUri },
} = config;

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
      species: formatTypesOfPoultry(claim.data?.typesOfPoultry),
      lastVisitDate: claim.data?.dateOfVisit ? formatDate(claim.data.dateOfVisit) : undefined,
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
const errorMessage10Months = "There must be at least 10 months between your reviews.";

const buildViewData = (previousClaims) => {
  const previousSites = getUniqueSites(previousClaims);

  if (previousSites.length > 1) {
    return {
      backLink: poultryClaimRoutes.dateOfVisit,
      pageTitleText: "Select the site you are claiming for",
      sites: previousSites,
      radioValueNewSite,
    };
  }

  const site = previousSites[0];
  return {
    backLink: poultryClaimRoutes.dateOfVisit,
    pageTitleText: "Your previous claim",
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
      const { previousClaims, dateOfVisit, tempHerdId } = getSessionData(
        request,
        sessionEntryKeys.poultryClaim,
      );

      await setSessionData(
        request,
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.siteSelected,
        siteSelected,
        { shouldEmitEvent: false },
      );

      if (siteSelected === radioValueNewSite) {
        await cleanSiteData(request, tempHerdId);
        return h.redirect(poultryClaimRoutes.enterSiteName);
      }

      const sites = getUniqueSites(previousClaims);
      const selectedSite = sites.find((site) => site.id === siteSelected);

      const previousClaimForSite = previousClaims?.find((claim) => claim.herd?.id === siteSelected);

      if (
        previousClaimForSite &&
        areDatesWithin10Months(dateOfVisit, previousClaimForSite.data.dateOfVisit)
      ) {
        await sendInvalidDataPoultryEvent({
          request,
          sessionKey: sessionKeys.poultryClaim.dateOfVisit,
          exception: `Value ${dateOfVisit} is invalid. Error: ${errorMessage10Months}`,
        });

        return h
          .view(poultryClaimViews.cannotContinueTimingRules, {
            backLink: poultryClaimRoutes.selectTheSite,
            backToDateLink: poultryClaimRoutes.dateOfVisit,
            guidanceUri,
          })
          .code(HttpStatus.BAD_REQUEST);
      }

      await setupSiteData(request, selectedSite);

      return h.redirect(poultryClaimRoutes.selectPoultryType);
    },
  },
};

async function setupSiteData(request, selectedSite) {
  await setSessionData(
    request,
    sessionEntryKeys.poultryClaim,
    sessionKeys.poultryClaim.herdId,
    selectedSite.id,
    { shouldEmitEvent: false },
  );
  await setSessionData(
    request,
    sessionEntryKeys.poultryClaim,
    sessionKeys.poultryClaim.herdName,
    selectedSite.name,
    { shouldEmitEvent: false },
  );
  await setSessionData(
    request,
    sessionEntryKeys.poultryClaim,
    sessionKeys.poultryClaim.herdCph,
    selectedSite.cph,
    { shouldEmitEvent: false },
  );
  await setSessionData(
    request,
    sessionEntryKeys.poultryClaim,
    sessionKeys.poultryClaim.herdSame,
    "yes",
    { shouldEmitEvent: false },
  );
  await setSessionData(
    request,
    sessionEntryKeys.poultryClaim,
    sessionKeys.poultryClaim.isOnlyHerdOnSbi,
    "no",
    { shouldEmitEvent: false },
  );
}

async function cleanSiteData(request, tempHerdId) {
  await setSessionData(
    request,
    sessionEntryKeys.poultryClaim,
    sessionKeys.poultryClaim.herdId,
    tempHerdId,
    { shouldEmitEvent: false },
  );
  await setSessionData(
    request,
    sessionEntryKeys.poultryClaim,
    sessionKeys.poultryClaim.herdName,
    null,
    { shouldEmitEvent: false },
  );
  await setSessionData(
    request,
    sessionEntryKeys.poultryClaim,
    sessionKeys.poultryClaim.herdCph,
    null,
    { shouldEmitEvent: false },
  );
  await setSessionData(
    request,
    sessionEntryKeys.poultryClaim,
    sessionKeys.poultryClaim.herdSame,
    "no",
    { shouldEmitEvent: false },
  );
}

export const poultrySelectTheSiteHandlers = [getHandler, postHandler];

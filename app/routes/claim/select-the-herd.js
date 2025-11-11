import Joi from "joi";
import {
  removeSessionDataForSelectHerdChange,
  sessionKeys,
  sessionEntryKeys, setSessionData, getSessionData
} from "../../session/index.js";
import HttpStatus from "http-status-codes";
import { ONLY_HERD, ONLY_HERD_ON_SBI } from "../../constants/claim-constants.js";
import { claimRoutes, claimViews } from "../../constants/routes.js";
import { canMakeClaim } from "../../lib/can-make-claim.js";
import { formatDate, getHerdOrFlock } from "../../lib/display-helpers.js";
import { getClaimInfo } from "../utils/get-claim-info.js";
import { getReviewType } from "../../lib/utils.js";
import { claimType } from "ffc-ahwr-common-library";


const pageUrl = claimRoutes.selectTheHerd;

const radioValueUnnamedHerd = "UNNAMED_HERD";
const radioValueNewHerd = "NEW_HERD";

const getMostRecentClaimWithoutHerd = (previousClaims, typeOfLivestock) => {
  const claimsWithoutHerd = previousClaims.filter(
    (claim) => claim.data.typeOfLivestock === typeOfLivestock && !claim.herd?.id,
  );

  if (claimsWithoutHerd.length === 0) {
    return null;
  }

  return claimsWithoutHerd.reduce((latest, current) =>
    new Date(current.data.dateOfVisit) > new Date(latest.data.dateOfVisit) ? current : latest,
  );
};

const createUnnamedHerd = (claim, typeOfLivestock) => ({
  id: radioValueUnnamedHerd,
  name: `Unnamed ${getHerdOrFlock(typeOfLivestock)} (Last claim: ${claim.data.claimType === claimType.review ? "review" : "follow-up"} visit on the ${formatDate(claim.data.dateOfVisit)})`,
});

const getHandler = {
  method: "GET",
  path: pageUrl,
  options: {
    handler: async (request, h) => {
      const { typeOfLivestock, previousClaims, herds, herdSelected } = getSessionData(request, sessionEntryKeys.endemicsClaim);

      const herdOrFlock = getHerdOrFlock(typeOfLivestock);
      const claimInfo = getClaimInfo(previousClaims, typeOfLivestock);

      const claimWithoutHerd = getMostRecentClaimWithoutHerd(previousClaims, typeOfLivestock);

      return h.view(claimViews.selectTheHerd, {
        backLink: claimRoutes.dateOfVisit,
        pageTitleText:
          herds.length > 1
            ? `Select the ${herdOrFlock} you are claiming for`
            : `Is this the same ${herdOrFlock} you have previously claimed for?`,
        radioValueNewHerd,
        ...claimInfo,
        herds: claimWithoutHerd
          ? herds.concat(createUnnamedHerd(claimWithoutHerd, typeOfLivestock))
          : herds,
        herdOrFlock,
        herdSelected,
      });
    },
  },
};

const addHerdToSession = (request, existingHerd, herds) => {
  if (existingHerd) {
    setSessionData(request, sessionEntryKeys.endemicsClaim,sessionKeys.endemicsClaim.herdVersion, existingHerd.version + 1);
    setSessionData(request, sessionEntryKeys.endemicsClaim,sessionKeys.endemicsClaim.herdName, existingHerd.name);
    setSessionData(request, sessionEntryKeys.endemicsClaim,sessionKeys.endemicsClaim.herdCph, existingHerd.cph);
    setSessionData(request, sessionEntryKeys.endemicsClaim,sessionKeys.endemicsClaim.herdReasons, existingHerd.reasons);
    setSessionData(request, sessionEntryKeys.endemicsClaim,sessionKeys.endemicsClaim.isOnlyHerdOnSbi,
      existingHerd.reasons?.[0] === ONLY_HERD ? ONLY_HERD_ON_SBI.YES : ONLY_HERD_ON_SBI.NO);
  } else {
    if (herds.length) {
      setSessionData(request, sessionEntryKeys.endemicsClaim,sessionKeys.endemicsClaim.isOnlyHerdOnSbi, ONLY_HERD_ON_SBI.NO);
    }
    setSessionData(request, sessionEntryKeys.endemicsClaim,sessionKeys.endemicsClaim.herdVersion, 1);
  }
};

const isUnnamedHerdClaim = (herdId, claim) =>
  herdId === radioValueUnnamedHerd && !claim.herd?.id;

const postHandler = {
  method: "POST",
  path: pageUrl,
  options: {
    validate: {
      payload: Joi.object({
        herdSelected: Joi.alternatives()
          .try(Joi.string().valid(radioValueUnnamedHerd, radioValueNewHerd), Joi.string().uuid())
          .required(),
      }),
      failAction: async (request, h, err) => {
        request.logger.setBindings({ error: err });
        const { typeOfLivestock, previousClaims, herds, herdSelected } = getSessionData(request, sessionEntryKeys.endemicsClaim);

        const herdOrFlock = getHerdOrFlock(typeOfLivestock);
        const claimInfo = getClaimInfo(previousClaims, typeOfLivestock);

        const claimWithoutHerd = getMostRecentClaimWithoutHerd(previousClaims, typeOfLivestock);

        return h
          .view(claimViews.selectTheHerd, {
            ...request.payload,
            errorMessage: {
              text: `Select the ${herdOrFlock} you are claiming for`,
              href: "#herdSelected",
            },
            backLink: claimRoutes.dateOfVisit,
            pageTitleText:
              herds.length > 1
                ? `Select the ${herdOrFlock} you are claiming for`
                : `Is this the same ${herdOrFlock} you have previously claimed for?`,
            radioValueNewHerd,
            ...claimInfo,
            herds: claimWithoutHerd
              ? herds.concat(createUnnamedHerd(claimWithoutHerd, typeOfLivestock))
              : herds,
            herdOrFlock,
            herdSelected,
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      },
    },
    handler: async (request, h) => {
      const { herdSelected } = request.payload;
      const {
        tempHerdId,
        herds,
        typeOfReview,
        previousClaims,
        typeOfLivestock,
        dateOfVisit,
        organisation,
        latestVetVisitApplication: oldWorldApplication,
        herdSelected: herdSelectedFromSession,
      } = getSessionData(request, sessionEntryKeys.endemicsClaim);

      if (herdSelected !== herdSelectedFromSession) {
        removeSessionDataForSelectHerdChange(request);
      }

      setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.herdSelected,
        herdSelected,
      );

      if ([radioValueUnnamedHerd, radioValueNewHerd].includes(herdSelected)) {
        setSessionData(
          request,
          sessionEntryKeys.endemicsClaim,
          sessionKeys.endemicsClaim.herdId,
          tempHerdId,
        );
      } else {
        setSessionData(
          request,
          sessionEntryKeys.endemicsClaim,
          sessionKeys.endemicsClaim.herdId,
          herdSelected,
        );
      }

      const { isReview } = getReviewType(typeOfReview);

      if (herdSelected === radioValueNewHerd && typeOfReview === claimType.endemics) {
        return h
          .view(claimViews.selectTheHerdException, {
            backLink: pageUrl,
            claimForAReviewLink: claimRoutes.whichTypeOfReview,
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      }

      const prevHerdClaims = previousClaims.filter(
        (claim) =>
          claim.data.typeOfLivestock === typeOfLivestock &&
          (isUnnamedHerdClaim(herdSelected, claim) || claim.herd?.id === herdSelected),
      );
      const errorMessage = canMakeClaim({
        prevClaims: prevHerdClaims,
        typeOfReview,
        dateOfVisit,
        organisation,
        typeOfLivestock,
        oldWorldApplication,
      });

      if (errorMessage) {
        // TODO - raise invalid data event
        // raiseInvalidDataEvent(
        //   request,
        //   dateOfVisitKey,
        //   `Value ${dateOfVisit} is invalid. Error: ${errorMessage}`,
        // );

        return h
          .view(claimViews.selectTheHerdDateException, {
            backLink: pageUrl,
            errorMessage,
            backToPageMessage: `Enter the date the vet last visited your farm for this ${isReview ? "review" : "follow-up"}.`,
            backToPageLink: claimRoutes.dateOfVisit,
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      }

      const existingHerd = herds.find((herd) => herd.id === herdSelected);
      addHerdToSession(request, existingHerd, herds);
      if (herdSelected === radioValueUnnamedHerd) {
        setSessionData(
          request,
          sessionEntryKeys.endemicsClaim,
          sessionKeys.endemicsClaim.herdSame,
          'yes',
        );
      }

      const nextPageUrl = existingHerd ? claimRoutes.checkHerdDetails : claimRoutes.enterHerdName;

      return h.redirect(nextPageUrl);
    },
  },
};

export const selectTheHerdHandlers = [getHandler, postHandler];

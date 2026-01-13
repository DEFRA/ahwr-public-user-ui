import Joi from "joi";
import {
  removeSessionDataForSelectHerdChange,
  sessionKeys,
  sessionEntryKeys,
  setSessionData,
  getSessionData,
} from "../../session/index.js";
import HttpStatus from "http-status-codes";
import { ONLY_HERD, ONLY_HERD_ON_SBI } from "../../constants/claim-constants.js";
import { claimRoutes, claimViews } from "../../constants/routes.js";
import { canMakeClaim } from "../../lib/can-make-claim.js";
import { formatDate, getHerdOrFlock } from "../../lib/display-helpers.js";
import { getClaimInfo } from "../utils/get-claim-info.js";
import { getReviewType } from "../../lib/utils.js";
import { claimType } from "ffc-ahwr-common-library";
import { sendInvalidDataEvent } from "../../messaging/ineligibility-event-emission.js";

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
  name: `Unnamed ${getHerdOrFlock(typeOfLivestock)} (Last claim: ${claim.type === claimType.review ? "review" : "follow-up"} visit on the ${formatDate(claim.data.dateOfVisit)})`,
});

const getHandler = {
  method: "GET",
  path: pageUrl,
  options: {
    handler: async (request, h) => {
      const { typeOfLivestock, previousClaims, herds, herdSelected } = getSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
      );

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

const addHerdToSession = async (request, existingHerd, herds) => {
  if (existingHerd) {
    await setSessionData(
      request,
      sessionEntryKeys.endemicsClaim,
      sessionKeys.endemicsClaim.herdVersion,
      existingHerd.version + 1,
      { shouldEmitEvent: false },
    );
    await setSessionData(
      request,
      sessionEntryKeys.endemicsClaim,
      sessionKeys.endemicsClaim.herdName,
      existingHerd.name,
      { shouldEmitEvent: false },
    );
    await setSessionData(
      request,
      sessionEntryKeys.endemicsClaim,
      sessionKeys.endemicsClaim.herdCph,
      existingHerd.cph,
      { shouldEmitEvent: false },
    );
    await setSessionData(
      request,
      sessionEntryKeys.endemicsClaim,
      sessionKeys.endemicsClaim.herdReasons,
      existingHerd.reasons,
      { shouldEmitEvent: false },
    );
    await setSessionData(
      request,
      sessionEntryKeys.endemicsClaim,
      sessionKeys.endemicsClaim.isOnlyHerdOnSbi,
      existingHerd.reasons?.[0] === ONLY_HERD ? ONLY_HERD_ON_SBI.YES : ONLY_HERD_ON_SBI.NO,
      { shouldEmitEvent: false },
    );
  } else {
    if (herds.length) {
      await setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.isOnlyHerdOnSbi,
        ONLY_HERD_ON_SBI.NO,
        { shouldEmitEvent: false },
      );
    }
    await setSessionData(
      request,
      sessionEntryKeys.endemicsClaim,
      sessionKeys.endemicsClaim.herdVersion,
      1,
      { shouldEmitEvent: false },
    );
  }
};

const isUnnamedHerdClaim = (herdId, claim) => herdId === radioValueUnnamedHerd && !claim.herd?.id;

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
      failAction: async (request, h, error) => {
        request.logger.error({ error });
        const { typeOfLivestock, previousClaims, herds, herdSelected } = getSessionData(
          request,
          sessionEntryKeys.endemicsClaim,
        );

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
      const organisation = getSessionData(request, sessionEntryKeys.organisation);
      const {
        tempHerdId,
        herds,
        typeOfReview,
        previousClaims,
        typeOfLivestock,
        dateOfVisit,
        latestVetVisitApplication: oldWorldApplication,
        herdSelected: herdSelectedFromSession,
      } = getSessionData(request, sessionEntryKeys.endemicsClaim);

      if (herdSelected !== herdSelectedFromSession) {
        removeSessionDataForSelectHerdChange(request);
      }

      await setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.herdSelected,
        herdSelected,
        { shouldEmitEvent: false },
      );

      if ([radioValueUnnamedHerd, radioValueNewHerd].includes(herdSelected)) {
        await setSessionData(
          request,
          sessionEntryKeys.endemicsClaim,
          sessionKeys.endemicsClaim.herdId,
          tempHerdId,
          { shouldEmitEvent: false },
        );
      } else {
        await setSessionData(
          request,
          sessionEntryKeys.endemicsClaim,
          sessionKeys.endemicsClaim.herdId,
          herdSelected,
          { shouldEmitEvent: false },
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
        await sendInvalidDataEvent({
          request,
          sessionKey: sessionKeys.endemicsClaim.dateOfVisit,
          exception: `Value ${dateOfVisit} is invalid. Error: ${errorMessage}`,
        });

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
      await addHerdToSession(request, existingHerd, herds);
      if (herdSelected === radioValueUnnamedHerd) {
        await setSessionData(
          request,
          sessionEntryKeys.endemicsClaim,
          sessionKeys.endemicsClaim.herdSame,
          "yes",
          { shouldEmitEvent: false },
        );
      }

      const nextPageUrl = existingHerd ? claimRoutes.checkHerdDetails : claimRoutes.enterHerdName;

      return h.redirect(nextPageUrl);
    },
  },
};

export const selectTheHerdHandlers = [getHandler, postHandler];

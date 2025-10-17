import Joi from "joi";
import links from "../../config/routes.js";
import { sessionKeys } from "../../session/keys.js";
import {
  getEndemicsClaim,
  removeSessionDataForSelectHerdChange,
  setEndemicsClaim,
} from "../../session/index.js";
import HttpStatus from "http-status-codes";
import { claimConstants } from "../../constants/claim-constants.js";
import { canMakeClaim } from "../../lib/can-make-claim.js";
import { raiseInvalidDataEvent } from "../../event/raise-invalid-data-event.js";
import { getReviewType } from "../../lib/get-review-type.js";
import { ONLY_HERD, ONLY_HERD_ON_SBI } from "../../constants/constants.js";
import { formatDate, getHerdOrFlock } from "../../lib/display-helpers.js";
import { prefixUrl } from "../utils/page-utils.js";

const { endemics } = claimConstants.claimType;

const {
  endemicsSelectTheHerd,
  endemicsDateOfVisit,
  endemicsEnterHerdName,
  endemicsCheckHerdDetails,
  endemicsSelectTheHerdException,
  endemicsSelectTheHerdDateException,
  endemicsWhichTypeOfReview,
} = links;

const pageUrl = prefixUrl(endemicsSelectTheHerd);
const previousPageUrl = prefixUrl(endemicsDateOfVisit);
const enterHerdNamePageUrl = prefixUrl(endemicsEnterHerdName);
const checkHerdDetailsPageUrl = prefixUrl(endemicsCheckHerdDetails);
const whichTypeOfReviewPageUrl = prefixUrl(endemicsWhichTypeOfReview);
const dateOfVisitPageUrl = prefixUrl(endemicsDateOfVisit);

const {
  endemicsClaim: {
    herdSelected: herdSelectedKey,
    herdId: herdIdKey,
    herdVersion: herdVersionKey,
    herdName: herdNameKey,
    herdCph: herdCphKey,
    herdReasons: herdReasonsKey,
    dateOfVisit: dateOfVisitKey,
    isOnlyHerdOnSbi: isOnlyHerdOnSbiKey,
    herdSame: herdSameKey,
  },
} = sessionKeys;

const radioValueUnnamedHerd = "UNNAMED_HERD";
const radioValueNewHerd = "NEW_HERD";

const getClaimInfo = (previousClaims, typeOfLivestock) => {
  let claimTypeText;
  let dateOfVisitText;
  let claimDateText;

  const previousClaimsForSpecies = previousClaims?.filter(
    (claim) => claim.data.typeOfLivestock === typeOfLivestock,
  );
  if (previousClaimsForSpecies && previousClaimsForSpecies.length > 0) {
    const {
      createdAt,
      data: { dateOfVisit, claimType },
    } = previousClaimsForSpecies.reduce((latest, claim) => {
      return claim.createdAt > latest.createdAt ? claim : latest;
    });

    claimTypeText = claimType === "R" ? "Review" : "Endemics";
    dateOfVisitText = new Date(dateOfVisit).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    claimDateText = new Date(createdAt).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  return {
    species: typeOfLivestock,
    claimType: claimTypeText,
    lastVisitDate: dateOfVisitText,
    claimDate: claimDateText,
  };
};

const getMostRecentClaimWithoutHerd = (previousClaims, typeOfLivestock) => {
  const claimsWithoutHerd = previousClaims.filter(
    (claim) => claim.data.typeOfLivestock === typeOfLivestock && !claim.data.herdId,
  );

  if (claimsWithoutHerd.length === 0) {
    return null;
  }

  return claimsWithoutHerd.reduce((latest, current) =>
    new Date(current.data.dateOfVisit) > new Date(latest.data.dateOfVisit) ? current : latest,
  );
};

const createUnnamedHerd = (claim, typeOfLivestock) => ({
  herdId: radioValueUnnamedHerd,
  herdName: `Unnamed ${getHerdOrFlock(typeOfLivestock)} (Last claim: ${claim.data.claimType === "R" ? "review" : "follow-up"} visit on the ${formatDate(claim.data.dateOfVisit)})`,
});

const getHandler = {
  method: "GET",
  path: pageUrl,
  options: {
    tags: ["mh"],
    handler: async (request, h) => {
      const { typeOfLivestock, previousClaims, herds, herdSelected } = getEndemicsClaim(request);

      const herdOrFlock = getHerdOrFlock(typeOfLivestock);
      const claimInfo = getClaimInfo(previousClaims, typeOfLivestock);

      const claimWithoutHerd = getMostRecentClaimWithoutHerd(previousClaims, typeOfLivestock);

      return h.view(endemicsSelectTheHerd, {
        backLink: previousPageUrl,
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
    setEndemicsClaim(request, herdVersionKey, existingHerd.herdVersion + 1, {
      shouldEmitEvent: false,
    });
    setEndemicsClaim(request, herdNameKey, existingHerd.herdName, { shouldEmitEvent: false });
    setEndemicsClaim(request, herdCphKey, existingHerd.cph, { shouldEmitEvent: false });
    setEndemicsClaim(request, herdReasonsKey, existingHerd.herdReasons, { shouldEmitEvent: false });
    setEndemicsClaim(
      request,
      isOnlyHerdOnSbiKey,
      existingHerd.herdReasons?.[0] === ONLY_HERD ? ONLY_HERD_ON_SBI.YES : ONLY_HERD_ON_SBI.NO,
      { shouldEmitEvent: false },
    );
  } else {
    if (herds.length) {
      setEndemicsClaim(request, isOnlyHerdOnSbiKey, ONLY_HERD_ON_SBI.NO, {
        shouldEmitEvent: false,
      });
    }
    setEndemicsClaim(request, herdVersionKey, 1, { shouldEmitEvent: false });
  }
};

const isUnnamedHerdClaim = (herdId, claim) =>
  herdId === radioValueUnnamedHerd && !claim.data.herdId;

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
        request.logger.setBindings({ err });
        const { typeOfLivestock, previousClaims, herds, herdSelected } = getEndemicsClaim(request);

        const herdOrFlock = getHerdOrFlock(typeOfLivestock);
        const claimInfo = getClaimInfo(previousClaims, typeOfLivestock);

        const claimWithoutHerd = getMostRecentClaimWithoutHerd(previousClaims, typeOfLivestock);

        return h
          .view(endemicsSelectTheHerd, {
            ...request.payload,
            errorMessage: {
              text: `Select the ${herdOrFlock} you are claiming for`,
              href: "#herdSelected",
            },
            backLink: previousPageUrl,
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
      } = getEndemicsClaim(request);

      if (herdSelected !== herdSelectedFromSession) {
        removeSessionDataForSelectHerdChange(request);
      }

      setEndemicsClaim(request, herdSelectedKey, herdSelected, { shouldEmitEvent: false });

      if ([radioValueUnnamedHerd, radioValueNewHerd].includes(herdSelected)) {
        setEndemicsClaim(request, herdIdKey, tempHerdId, { shouldEmitEvent: false });
      } else {
        setEndemicsClaim(request, herdIdKey, herdSelected, { shouldEmitEvent: false });
      }

      const { isReview } = getReviewType(typeOfReview);

      if (herdSelected === radioValueNewHerd && typeOfReview === endemics) {
        return h
          .view(endemicsSelectTheHerdException, {
            backLink: pageUrl,
            claimForAReviewLink: whichTypeOfReviewPageUrl,
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      }

      const prevHerdClaims = previousClaims.filter(
        (claim) =>
          claim.data.typeOfLivestock === typeOfLivestock &&
          (isUnnamedHerdClaim(herdSelected, claim) || claim.data.herdId === herdSelected),
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
        raiseInvalidDataEvent(
          request,
          dateOfVisitKey,
          `Value ${dateOfVisit} is invalid. Error: ${errorMessage}`,
        );

        return h
          .view(endemicsSelectTheHerdDateException, {
            backLink: pageUrl,
            errorMessage,
            backToPageMessage: `Enter the date the vet last visited your farm for this ${isReview ? "review" : "follow-up"}.`,
            backToPageLink: dateOfVisitPageUrl,
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      }

      const existingHerd = herds.find((herd) => herd.herdId === herdSelected);
      addHerdToSession(request, existingHerd, herds);
      if (herdSelected === radioValueUnnamedHerd) {
        setEndemicsClaim(request, herdSameKey, "yes", { shouldEmitEvent: false });
      }

      const nextPageUrl = existingHerd ? checkHerdDetailsPageUrl : enterHerdNamePageUrl;

      return h.redirect(nextPageUrl);
    },
  },
};

export const selectTheHerdHandlers = [getHandler, postHandler];

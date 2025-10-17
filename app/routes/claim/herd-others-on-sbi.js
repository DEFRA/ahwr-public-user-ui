import Joi from "joi";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../session/index.js";
import HttpStatus from "http-status-codes";
import { ONLY_HERD, ONLY_HERD_ON_SBI } from "../../constants/claim-constants.js";
import { getHerdOrFlock } from "../../lib/display-helpers.js";
import { claimRoutes, claimViews } from "../../constants/routes.js";

const getSpeciesGroupText = (typeOfLivestock) => {
  const textByLivestock = {
    beef: "beef cattle herd",
    dairy: "dairy cattle herd",
    pigs: "pigs herd",
    sheep: "flock of sheep",
  };
  return textByLivestock[typeOfLivestock];
};

const getHandler = {
  method: "GET",
  path: "/herd-others-on-sbi",
  options: {
    tags: ["mh"],
    handler: async (request, h) => {
      const { isOnlyHerdOnSbi, typeOfLivestock } = getSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
      );
      return h.view(claimViews.herdOthersOnSbi, {
        backLink: claimRoutes.enterCphNumber,
        isOnlyHerdOnSbi,
        herdOrFlock: getHerdOrFlock(typeOfLivestock),
        speciesGroupText: getSpeciesGroupText(typeOfLivestock),
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: "/herd-others-on-sbi",
  options: {
    validate: {
      payload: Joi.object({
        isOnlyHerdOnSbi: Joi.string().required(),
      }),
      failAction: async (request, h, err) => {
        request.logger.setBindings({ err });
        const { typeOfLivestock } = getSessionData(request, sessionEntryKeys.endemicsClaim);

        return h
          .view(claimViews.herdOthersOnSbi, {
            ...request.payload,
            errorMessage: {
              text: `Select yes if this is the only ${getSpeciesGroupText(typeOfLivestock)} associated with this SBI`,
              href: "#isOnlyHerdOnSbi",
            },
            backLink: claimRoutes.enterCphNumber,
            herdOrFlock: getHerdOrFlock(typeOfLivestock),
            speciesGroupText: getSpeciesGroupText(typeOfLivestock),
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      },
    },
    handler: async (request, h) => {
      const { isOnlyHerdOnSbi } = request.payload;
      setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.isOnlyHerdOnSbi,
        isOnlyHerdOnSbi,
      );

      if (isOnlyHerdOnSbi === ONLY_HERD_ON_SBI.YES) {
        setSessionData(
          request,
          sessionEntryKeys.endemicsClaim,
          sessionKeys.endemicsClaim.herdReasons,
          [ONLY_HERD],
        );

        const { herdId, herdVersion } = getSessionData(request, sessionEntryKeys.endemicsClaim);

        // TODO - emit herd event that the user has set herd reasons

        return h.redirect(claimRoutes.checkHerdDetailsPageUrl);
      }

      return h.redirect(claimRoutes.enterHerdDetails);
    },
  },
};

export const herdOthersOnSbiHandlers = [getHandler, postHandler];

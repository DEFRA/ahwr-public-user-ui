import Joi from "joi";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../session/index.js";
import HttpStatus from "http-status-codes";
import { getHerdOrFlock } from "../../lib/display-helpers.js";
import { ONLY_HERD_ON_SBI } from "../../constants/claim-constants.js";
import { skipOtherHerdsOnSbiPage } from "../../lib/context-helper.js";
import { claimRoutes, claimViews } from "../../constants/routes.js";

const getBackLink = (herdVersion) =>
  !herdVersion || herdVersion === 1 ? claimRoutes.enterHerdName : claimRoutes.selectTheHerd;

const getHandler = {
  method: "GET",
  path: "/enter-cph-number",
  options: {
    tags: ["mh"],
    handler: async (request, h) => {
      const { herdCph, typeOfLivestock, herdVersion } = getSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
      );

      return h.view(claimViews.enterCphNumber, {
        backLink: getBackLink(herdVersion),
        herdCph,
        herdOrFlock: getHerdOrFlock(typeOfLivestock),
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: "/enter-cph-number",
  options: {
    validate: {
      payload: Joi.object({
        herdCph: Joi.string()
          .pattern(/^\d{2}\/\d{3}\/\d{4}$/)
          .required(),
      }),
      failAction: async (request, h, err) => {
        request.logger.setBindings({ err });
        const { typeOfLivestock, herdVersion } = getSessionData(
          request,
          sessionEntryKeys.endemicsClaim,
        );

        return h
          .view(claimViews.enterCphNumber, {
            ...request.payload,
            errorMessage: {
              text: `Enter the CPH for this ${getHerdOrFlock(typeOfLivestock)}, format should be nn/nnn/nnnn`,
              href: "#herdCph",
            },
            backLink: getBackLink(herdVersion),
            herdOrFlock: getHerdOrFlock(typeOfLivestock),
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      },
    },
    handler: async (request, h) => {
      const { herdCph } = request.payload;
      const { herds, isOnlyHerdOnSbi, herdId,
      //  herdVersion // TODO: herdVersion should go in the emitted event below
      } = getSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
      );

      setSessionData(request, sessionEntryKeys.endemicsClaim, sessionKeys.endemicsClaim.herdCph, herdCph);

      // TODO - Emit event saying the herd CPH number was collected

      let nextPageUrl;

      if (skipOtherHerdsOnSbiPage(herds, herdId)) {
        nextPageUrl =
          isOnlyHerdOnSbi === ONLY_HERD_ON_SBI.NO
            ? claimRoutes.enterHerdDetails
            : claimRoutes.checkHerdDetails;
      } else {
        nextPageUrl = claimRoutes.herdOthersOnSbi;
      }

      return h.redirect(nextPageUrl);
    },
  },
};

export const enterCphNumberHandlers = [getHandler, postHandler];

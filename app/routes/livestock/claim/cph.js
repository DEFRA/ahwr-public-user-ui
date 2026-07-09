import Joi from "joi";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
  emitHerdEvent,
} from "../../../session/index.js";
import HttpStatus from "http-status-codes";
import { getHerdOrFlock } from "../../../lib/display-helpers.js";
import { ONLY_HERD_ON_SBI } from "../../../constants/claim-constants.js";
import { skipOtherHerdsOnSbiPage } from "../../../lib/context-helper.js";
import { livestockClaimRoutes, livestockClaimViews } from "../../../constants/routes.js";
import { normalizeCphNumber } from "../../../lib/cph-normalization.js";

const getBackLink = (herdVersion) =>
  !herdVersion || herdVersion === 1
    ? livestockClaimRoutes.enterHerdName
    : livestockClaimRoutes.selectTheHerd;

const getHandler = {
  method: "GET",
  path: livestockClaimRoutes.enterCphNumber,
  options: {
    tags: ["mh"],
    handler: async (request, h) => {
      const { herdCph, typeOfLivestock, herdVersion } = getSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
      );

      return h.view(livestockClaimViews.enterCphNumber, {
        backLink: getBackLink(herdVersion),
        herdCph,
        herdOrFlock: getHerdOrFlock(typeOfLivestock),
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: livestockClaimRoutes.enterCphNumber,
  options: {
    validate: {
      payload: Joi.object({
        herdCph: Joi.string()
          .custom((value, _) => normalizeCphNumber(value))
          .pattern(/^\d{2}\/\d{3}\/\d{4}$/)
          .required(),
      }),
      failAction: async (request, h, error) => {
        request.logger.error({ error });
        const { typeOfLivestock, herdVersion } = getSessionData(
          request,
          sessionEntryKeys.endemicsClaim,
        );

        return h
          .view(livestockClaimViews.enterCphNumber, {
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
      const { herds, isOnlyHerdOnSbi, herdId, herdVersion } = getSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
      );

      await setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.herdCph,
        herdCph,
        { shouldEmitEvent: false },
      );

      await emitHerdEvent({
        request,
        type: "herd-cph",
        message: "Herd CPH collected from user",
        data: { herdId, herdVersion, herdCph },
      });

      let nextPageUrl;

      if (skipOtherHerdsOnSbiPage(herds, herdId)) {
        nextPageUrl =
          isOnlyHerdOnSbi === ONLY_HERD_ON_SBI.NO
            ? livestockClaimRoutes.enterHerdDetails
            : livestockClaimRoutes.checkHerdDetails;
      } else {
        nextPageUrl = livestockClaimRoutes.herdOthersOnSbi;
      }

      return h.redirect(nextPageUrl);
    },
  },
};

export const enterCphNumberHandlers = [getHandler, postHandler];

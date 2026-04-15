import Joi from "joi";
import HttpStatus from "http-status-codes";
import { getLivestockTypes, getReviewType } from "../../lib/utils.js";
import {
  getSessionData,
  sessionEntryKeys,
  sessionKeys,
  setSessionData,
} from "../../session/index.js";
import { claimRoutes, claimViews } from "../../constants/routes.js";
import { vetsNameSchema } from "../utils/schemas.js";

const backLink = (request) => {
  const { typeOfLivestock, typeOfReview } = getSessionData(request, sessionEntryKeys.endemicsClaim);
  const { isBeef, isDairy } = getLivestockTypes(typeOfLivestock);
  const { isEndemicsFollowUp } = getReviewType(typeOfReview);

  if (isDairy || (isBeef && isEndemicsFollowUp)) {
    return claimRoutes.speciesNumbers;
  }

  return claimRoutes.numberOfSpeciesTested;
};

const getHandler = {
  method: "GET",
  path: claimRoutes.vetName,
  options: {
    handler: async (request, h) => {
      const { vetsName } = getSessionData(request, sessionEntryKeys.endemicsClaim);
      return h.view(claimViews.vetName, {
        vetsName,
        backLink: backLink(request),
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: claimRoutes.vetName,
  options: {
    validate: {
      payload: Joi.object({
        vetsName: vetsNameSchema,
      }),
      failAction: async (request, h, error) => {
        request.logger.error({ error });
        return h
          .view(claimViews.vetName, {
            ...request.payload,
            backLink: backLink(request),
            errorMessage: {
              text: error.details[0].message,
              href: `#${sessionKeys.endemicsClaim.vetsName}`,
            },
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      },
    },
    handler: async (request, h) => {
      const { vetsName } = request.payload;

      await setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.vetsName,
        vetsName,
      );
      return h.redirect(claimRoutes.vetRcvs);
    },
  },
};

export const vetsNameHandlers = [getHandler, postHandler];

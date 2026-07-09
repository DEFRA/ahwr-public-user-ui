import Joi from "joi";
import HttpStatus from "http-status-codes";
import { getLivestockTypes, getReviewType } from "../../../lib/utils.js";
import {
  getSessionData,
  sessionEntryKeys,
  sessionKeys,
  setSessionData,
} from "../../../session/index.js";
import { livestockClaimRoutes, livestockClaimViews } from "../../../constants/routes.js";
import { vetsNameSchema } from "../../utils/schemas.js";

const backLink = (request) => {
  const { typeOfLivestock, typeOfReview } = getSessionData(request, sessionEntryKeys.endemicsClaim);
  const { isBeef, isDairy } = getLivestockTypes(typeOfLivestock);
  const { isEndemicsFollowUp } = getReviewType(typeOfReview);

  if (isDairy || (isBeef && isEndemicsFollowUp)) {
    return livestockClaimRoutes.speciesNumbers;
  }

  return livestockClaimRoutes.numberOfSpeciesTested;
};

const getHandler = {
  method: "GET",
  path: livestockClaimRoutes.vetName,
  options: {
    handler: async (request, h) => {
      const { vetsName } = getSessionData(request, sessionEntryKeys.endemicsClaim);
      return h.view(livestockClaimViews.vetName, {
        vetsName,
        backLink: backLink(request),
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: livestockClaimRoutes.vetName,
  options: {
    validate: {
      payload: Joi.object({
        vetsName: vetsNameSchema,
      }),
      failAction: async (request, h, error) => {
        request.logger.error({ error });
        return h
          .view(livestockClaimViews.vetName, {
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
      return h.redirect(livestockClaimRoutes.vetRcvs);
    },
  },
};

export const vetsNameHandlers = [getHandler, postHandler];

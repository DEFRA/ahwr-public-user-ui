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

const errorMessages = {
  enterName: "Enter the vet's name",
  nameLength: "Vet's name must be 50 characters or fewer",
  namePattern:
    "Vet's name must only include letters a to z, numbers and special characters such as hyphens, spaces, apostrophes, ampersands, commas, brackets or a forward slash",
};

const MAX_VET_NAME_LENGTH = 50;
const VET_NAME_PATTERN = /^[A-Za-z0-9&,' \-/()]+$/;

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
        vetsName: Joi.string()
          .trim()
          .max(MAX_VET_NAME_LENGTH)
          .pattern(VET_NAME_PATTERN)
          .required()
          .messages({
            "any.required": errorMessages.enterName,
            "string.base": errorMessages.enterName,
            "string.empty": errorMessages.enterName,
            "string.max": errorMessages.nameLength,
            "string.pattern.base": errorMessages.namePattern,
          }),
      }),
      failAction: async (request, h, err) => {
        request.logger.setBindings({ err });
        return h
          .view(claimViews.vetName, {
            ...request.payload,
            backLink: backLink(request),
            errorMessage: {
              text: err.details[0].message,
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

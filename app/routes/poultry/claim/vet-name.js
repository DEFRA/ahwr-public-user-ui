import Joi from "joi";
import HttpStatus from "http-status-codes";
import {
  getSessionData,
  sessionEntryKeys,
  sessionKeys,
  setSessionData,
} from "../../../session/index.js";
import { poultryClaimRoutes, poultryClaimViews } from "../../../constants/routes.js";

const errorMessages = {
  enterName: "Enter the vet's name",
  nameLength: "Vet's name must be 50 characters or fewer",
  namePattern:
    "Vet's name must only include letters a to z, numbers and special characters such as hyphens, spaces, apostrophes, ampersands, commas, brackets or a forward slash",
};

const MAX_VET_NAME_LENGTH = 50;
const VET_NAME_PATTERN = /^[A-Za-z0-9&,' \-/()]+$/;

const getHandler = {
  method: "GET",
  path: poultryClaimRoutes.vetName,
  options: {
    handler: async (request, h) => {
      const vetsName = getSessionData(
        request,
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.vetsName,
      );
      return h.view(poultryClaimViews.vetName, {
        vetsName,
        backLink: poultryClaimRoutes.minimumNumberOfAnimals,
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: poultryClaimRoutes.vetName,
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
      failAction: async (request, h, error) => {
        request.logger.error({ error });
        return h
          .view(poultryClaimViews.vetName, {
            ...request.payload,
            backLink: poultryClaimRoutes.minimumNumberOfAnimals,
            errorMessage: {
              text: error.details[0].message,
              href: `#${sessionKeys.poultryClaim.vetsName}`,
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
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.vetsName,
        vetsName,
      );
      return h.redirect(poultryClaimRoutes.vetRcvs);
    },
  },
};

export const poultryVetsNameHandlers = [getHandler, postHandler];

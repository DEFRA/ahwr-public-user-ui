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
  enterRCVS: "Enter an RCVS number",
  validRCVS: "An RCVS number is a 7 digit number or a 6 digit number ending in a letter.",
};

const getHandler = {
  method: "GET",
  path: poultryClaimRoutes.vetRcvs,
  options: {
    handler: async (request, h) => {
      const { vetRCVSNumber } = getSessionData(request, sessionEntryKeys.poultryClaim);
      return h.view(poultryClaimViews.vetRcvs, {
        vetRCVSNumber,
        backLink: poultryClaimRoutes.vetName,
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: poultryClaimRoutes.vetRcvs,
  options: {
    validate: {
      payload: Joi.object({
        vetRCVSNumber: Joi.string()
          .trim()
          .pattern(/^\d{6}[\dX]$/i)
          .required()
          .messages({
            "any.required": errorMessages.enterRCVS,
            "string.base": errorMessages.enterRCVS,
            "string.empty": errorMessages.enterRCVS,
            "string.pattern.base": errorMessages.validRCVS,
          }),
      }),
      failAction: async (request, h, error) => {
        request.logger.error({ error });
        return h
          .view(poultryClaimViews.vetRcvs, {
            ...request.payload,
            backLink: poultryClaimRoutes.vetName,
            errorMessage: {
              text: error.details[0].message,
              href: `#${sessionKeys.poultryClaim.vetRCVSNumber}`,
            },
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      },
    },
    handler: async (request, h) => {
      const { vetRCVSNumber } = request.payload;

      await setSessionData(
        request,
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.vetRCVSNumber,
        vetRCVSNumber,
      );

      return h.redirect(poultryClaimRoutes.biosecurity);
    },
  },
};

export const poultryVetRCVSHandlers = [getHandler, postHandler];

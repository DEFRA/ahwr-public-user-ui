import Joi from "joi";
import HttpStatus from "http-status-codes";
import {
  getSessionData,
  sessionEntryKeys,
  sessionKeys,
  setSessionData,
} from "../../../session/index.js";
import { poultryClaimRoutes, poultryClaimViews } from "../../../constants/routes.js";
import { vetsNameSchema } from "../../utils/schemas.js";

const poultryVetsNameSchema = vetsNameSchema.messages({
  "string.pattern.base":
    "The vet's name must only include letters a to z, numbers and special characters such as hyphens, spaces, apostrophes, ampersands, commas, parentheses or a forward slash",
});

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
        backLink: poultryClaimRoutes.minimumBirds,
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
        vetsName: poultryVetsNameSchema,
      }),
      failAction: async (request, h, error) => {
        request.logger.error({ error });
        return h
          .view(poultryClaimViews.vetName, {
            ...request.payload,
            backLink: poultryClaimRoutes.minimumBirds,
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

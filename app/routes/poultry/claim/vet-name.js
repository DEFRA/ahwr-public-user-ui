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
        vetsName: vetsNameSchema,
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

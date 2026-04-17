import Joi from "joi";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../../session/index.js";
import { poultryClaimViews, poultryClaimRoutes } from "../../../constants/routes.js";
import HttpStatus from "http-status-codes";

const INVALID_VALUE_TEXT = "Select an option";

const getHandler = {
  method: "GET",
  path: poultryClaimRoutes.biosecurityUsefulness,
  options: {
    handler: async (request, h) => {
      const { biosecurityUsefulness } = getSessionData(request, sessionEntryKeys.poultryClaim);

      return h.view(poultryClaimViews.biosecurityUsefulness, {
        previousAnswer: biosecurityUsefulness,
        backLink: poultryClaimRoutes.biosecurity,
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: poultryClaimRoutes.biosecurityUsefulness,
  options: {
    validate: {
      payload: Joi.object({
        biosecurityUsefulness: Joi.string()
          .valid("very-useful", "somewhat-useful", "not-very-useful", "not-useful", "not-sure")
          .required()
          .messages({ "any.required": INVALID_VALUE_TEXT }),
      }),
      failAction: (request, h, error) => {
        request.logger.error({ error });
        const { biosecurityUsefulness } = request.payload;

        const errorMessage = { text: INVALID_VALUE_TEXT, href: "#biosecurityUsefulness" };
        const errors = {
          errorMessage,
          radioErrorMessage: biosecurityUsefulness === undefined ? errorMessage : undefined,
        };

        return h
          .view(poultryClaimViews.biosecurityUsefulness, {
            backLink: poultryClaimRoutes.biosecurity,
            ...errors,
            previousAnswer: biosecurityUsefulness,
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      },
    },
    handler: async (request, h) => {
      const { biosecurityUsefulness } = request.payload;

      await setSessionData(
        request,
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.biosecurityUsefulness,
        biosecurityUsefulness,
      );

      return h.redirect(poultryClaimRoutes.changesInBiosecurity);
    },
  },
};

export const poultryBiosecurityUsefulnessHandlers = [getHandler, postHandler];

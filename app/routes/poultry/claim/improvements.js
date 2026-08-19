import Joi from "joi";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../../session/index.js";
import { poultryClaimViews, poultryClaimRoutes } from "../../../constants/routes.js";
import { config } from "../../../config/index.js";
import HttpStatus from "http-status-codes";

const YES_TO_ASSESSMENT_TEXT = "Select if new biosecurity improvements were identified";

const getHandler = {
  method: "GET",
  path: poultryClaimRoutes.improvements,
  options: {
    handler: async (request, h) => {
      if (config.get("poultry.disableInterviewPage")) {
        return h.redirect(poultryClaimRoutes.checkAnswers);
      }

      const { biosecurityImprovements } = getSessionData(request, sessionEntryKeys.poultryClaim);

      return h.view(poultryClaimViews.improvements, {
        previousAnswer: biosecurityImprovements,
        backLink: poultryClaimRoutes.changesCost,
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: poultryClaimRoutes.improvements,
  options: {
    validate: {
      payload: Joi.object({
        biosecurityImprovements: Joi.string()
          .valid("yes", "no")
          .required()
          .messages({ "any.required": YES_TO_ASSESSMENT_TEXT }),
      }),
      failAction: (request, h, error) => {
        request.logger.error({ error });
        const { biosecurityImprovements } = request.payload;

        const errorMessage = { text: YES_TO_ASSESSMENT_TEXT, href: "#biosecurityImprovements" };
        const errors = {
          errorMessage,
          radioErrorMessage: biosecurityImprovements === undefined ? errorMessage : undefined,
        };

        return h
          .view(poultryClaimViews.improvements, {
            backLink: poultryClaimRoutes.changesCost,
            ...errors,
            previousAnswer: biosecurityImprovements,
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      },
    },
    handler: async (request, h) => {
      if (config.get("poultry.disableInterviewPage")) {
        return h.redirect(poultryClaimRoutes.checkAnswers);
      }

      const { biosecurityImprovements } = request.payload;

      await setSessionData(
        request,
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.biosecurityImprovements,
        biosecurityImprovements,
      );

      return h.redirect(poultryClaimRoutes.checkAnswers);
    },
  },
};

export const poultryImprovementsHandlers = [getHandler, postHandler];

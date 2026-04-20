import Joi from "joi";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../../session/index.js";
import { poultryClaimViews, poultryClaimRoutes } from "../../../constants/routes.js";
import HttpStatus from "http-status-codes";

const YES_TO_ASSESSMENT_TEXT = "Select an option";

const getHandler = {
  method: "GET",
  path: poultryClaimRoutes.interview,
  options: {
    handler: async (request, h) => {
      const { interview } = getSessionData(request, sessionEntryKeys.poultryClaim);

      return h.view(poultryClaimViews.interview, {
        previousAnswer: interview,
        backLink: poultryClaimRoutes.costOfChanges,
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: poultryClaimRoutes.interview,
  options: {
    validate: {
      payload: Joi.object({
        interview: Joi.string()
          .valid("yes", "no")
          .required()
          .messages({ "any.required": YES_TO_ASSESSMENT_TEXT }),
      }),
      failAction: (request, h, error) => {
        request.logger.error({ error });
        const { interview } = request.payload;

        const errorMessage = { text: YES_TO_ASSESSMENT_TEXT, href: "#interview" };
        const errors = {
          errorMessage,
          radioErrorMessage: interview === undefined ? errorMessage : undefined,
        };

        return h
          .view(poultryClaimViews.interview, {
            backLink: poultryClaimRoutes.costOfChanges,
            ...errors,
            previousAnswer: interview,
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      },
    },
    handler: async (request, h) => {
      const { interview } = request.payload;

      await setSessionData(
        request,
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.interview,
        interview,
      );

      return h.redirect(poultryClaimRoutes.checkAnswers);
    },
  },
};

export const poultryInterviewHandlers = [getHandler, postHandler];

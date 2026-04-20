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
  path: poultryClaimRoutes.costOfChanges,
  options: {
    handler: async (request, h) => {
      const { costOfChanges } = getSessionData(request, sessionEntryKeys.poultryClaim);

      return h.view(poultryClaimViews.costOfChanges, {
        previousAnswer: costOfChanges,
        backLink: poultryClaimRoutes.changesInBiosecurity,
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: poultryClaimRoutes.costOfChanges,
  options: {
    validate: {
      payload: Joi.object({
        costOfChanges: Joi.string()
          .valid("0-1500", "1500-3000", "3000-4500", "over-4500", "not-sure", "no-intention")
          .required()
          .messages({ "any.required": INVALID_VALUE_TEXT }),
      }),
      failAction: (request, h, error) => {
        request.logger.error({ error });
        const { costOfChanges } = request.payload;

        const errorMessage = { text: INVALID_VALUE_TEXT, href: "#costOfChanges" };
        const errors = {
          errorMessage,
          radioErrorMessage: costOfChanges === undefined ? errorMessage : undefined,
        };

        return h
          .view(poultryClaimViews.costOfChanges, {
            backLink: poultryClaimRoutes.changesInBiosecurity,
            ...errors,
            previousAnswer: costOfChanges,
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      },
    },
    handler: async (request, h) => {
      const { costOfChanges } = request.payload;

      await setSessionData(
        request,
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.costOfChanges,
        costOfChanges,
      );

      return h.redirect(poultryClaimRoutes.interview);
    },
  },
};

export const poultryBiosecurityCostOfChangesHandlers = [getHandler, postHandler];

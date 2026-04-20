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
  path: poultryClaimRoutes.changesInBiosecurity,
  options: {
    handler: async (request, h) => {
      const { changesInBiosecurity } = getSessionData(request, sessionEntryKeys.poultryClaim);

      return h.view(poultryClaimViews.changesInBiosecurity, {
        previousAnswer: changesInBiosecurity,
        backLink: poultryClaimRoutes.biosecurityUsefulness,
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: poultryClaimRoutes.changesInBiosecurity,
  options: {
    validate: {
      payload: Joi.object({
        changesInBiosecurity: Joi.string()
          .valid(
            "infra-and-control",
            "people-and-hygiene",
            "movement-and-management",
            "bird-handling",
            "cleaning",
            "no-recommendation",
          )
          .required()
          .messages({ "any.required": INVALID_VALUE_TEXT }),
      }),
      failAction: (request, h, error) => {
        request.logger.error({ error });
        const { changesInBiosecurity } = request.payload;

        const errorMessage = { text: INVALID_VALUE_TEXT, href: "#changesInBiosecurity" };
        const errors = {
          errorMessage,
          radioErrorMessage: changesInBiosecurity === undefined ? errorMessage : undefined,
        };

        return h
          .view(poultryClaimViews.changesInBiosecurity, {
            backLink: poultryClaimRoutes.biosecurityUsefulness,
            ...errors,
            previousAnswer: changesInBiosecurity,
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      },
    },
    handler: async (request, h) => {
      const { changesInBiosecurity } = request.payload;

      await setSessionData(
        request,
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.changesInBiosecurity,
        changesInBiosecurity,
      );

      return h.redirect(poultryClaimRoutes.costOfChanges);
    },
  },
};

export const poultryChangesInBiosecurityHandlers = [getHandler, postHandler];

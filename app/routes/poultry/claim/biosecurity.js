import Joi from "joi";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../../session/index.js";
import { poultryClaimViews, poultryClaimRoutes } from "../../../constants/routes.js";
import HttpStatus from "http-status-codes";
import { sendInvalidDataPoultryEvent } from "../../../messaging/ineligibility-event-emission.js";

const YES_TO_ASSESSMENT_TEXT = "Select yes if the vet did a biosecurity assessment";

const getHandler = {
  method: "GET",
  path: poultryClaimRoutes.biosecurity,
  options: {
    handler: async (request, h) => {
      const { biosecurity } = getSessionData(request, sessionEntryKeys.poultryClaim);

      return h.view(poultryClaimViews.biosecurity, {
        previousAnswer: biosecurity,
        backLink: poultryClaimRoutes.vetRcvs,
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: poultryClaimRoutes.biosecurity,
  options: {
    validate: {
      payload: Joi.object({
        biosecurity: Joi.string()
          .valid("yes", "no")
          .required()
          .messages({ "any.required": YES_TO_ASSESSMENT_TEXT }),
      }),
      failAction: (request, h, error) => {
        request.logger.error({ error });
        const { biosecurity } = request.payload;

        const errorMessage = { text: YES_TO_ASSESSMENT_TEXT, href: "#biosecurity" };
        const errors = {
          errorMessage,
          radioErrorMessage:
            biosecurity === undefined
              ? { text: YES_TO_ASSESSMENT_TEXT, href: "#biosecurity" }
              : undefined,
        };

        return h
          .view(poultryClaimViews.biosecurity, {
            backLink: poultryClaimRoutes.vetRcvs,
            ...errors,
            previousAnswer: biosecurity,
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      },
    },
    handler: async (request, h) => {
      const { biosecurity } = request.payload;

      await setSessionData(
        request,
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.biosecurity,
        biosecurity,
      );

      if (biosecurity === "no") {
        await sendInvalidDataPoultryEvent({
          request,
          sessionKey: sessionKeys.poultryClaim.biosecurity,
          exception: `Value ${biosecurity} is not equal to required value yes`,
        });

        return h
          .view(poultryClaimViews.biosecurityException, {
            backLink: poultryClaimRoutes.biosecurity,
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      }

      return h.redirect(poultryClaimRoutes.biosecurityUsefulness);
    },
  },
};

export const poultryBiosecurityHandlers = [getHandler, postHandler];

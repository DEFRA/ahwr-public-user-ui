import Joi from "joi";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../../session/index.js";
import HttpStatus from "http-status-codes";
import { poultryClaimRoutes, poultryClaimViews } from "../../../constants/routes.js";
import { sendInvalidDataPoultryEvent } from "../../../messaging/ineligibility-event-emission.js";
import { config } from "../../../config/index.js";

const {
  poultry: { guidanceUri },
} = config;

const getHandler = {
  method: "GET",
  path: poultryClaimRoutes.minimumBirds,
  options: {
    handler: async (request, h) => {
      const minimumNumberOfBirds = getSessionData(
        request,
        sessionEntryKeys.poultryClaim,
      )?.minimumNumberOfBirds;
      return h.view(poultryClaimViews.minimumBirds, {
        backLink: poultryClaimRoutes.poultryType,
        minimumNumberOfBirds,
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: poultryClaimRoutes.minimumBirds,
  options: {
    validate: {
      payload: Joi.object({
        minimumNumberOfBirds: Joi.string().required(),
      }),
      failAction: async (request, h, error) => {
        request.logger.error({ error });

        return h
          .view(poultryClaimViews.minimumBirds, {
            ...request.payload,
            errorMessage: {
              text: `Select if the vet has confirmed the minimum number of birds`,
              href: "#minimumNumberOfBirds",
            },
            backLink: poultryClaimRoutes.poultryType,
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      },
    },
    handler: async (request, h) => {
      const { minimumNumberOfBirds } = request.payload;

      await setSessionData(
        request,
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.minimumNumberOfBirds,
        minimumNumberOfBirds,
      );

      if (minimumNumberOfBirds === "yes") {
        return h.redirect(poultryClaimRoutes.vetName);
      } else {
        await sendInvalidDataPoultryEvent({
          request,
          sessionKey: sessionKeys.endemicsClaim.speciesNumbers, // reusing existing mi report event type for minimumNumberOfBirds
          exception: `Value ${minimumNumberOfBirds} is not equal to required value yes`,
        });
        return h.view(poultryClaimViews.minimumBirdsException, {
          backLink: poultryClaimRoutes.minimumBirds,
          guidanceUri,
        });
      }
    },
  },
};

export const poultryMinimumNumberOfBirdsHandlers = [getHandler, postHandler];

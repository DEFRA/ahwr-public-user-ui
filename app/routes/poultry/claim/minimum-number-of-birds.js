import Joi from "joi";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../../session/index.js";
import HttpStatus from "http-status-codes";
import { poultryClaimRoutes, poultryClaimViews } from "../../../constants/routes.js";

const getHandler = {
  method: "GET",
  path: poultryClaimRoutes.minimumNumberOfBirds,
  options: {
    handler: async (request, h) => {
      const minimumNumberOfBirds = getSessionData(
        request,
        sessionEntryKeys.poultryClaim,
      )?.minimumNumberOfBirds;
      return h.view(poultryClaimViews.minimumNumberOfBirds, {
        backLink: poultryClaimRoutes.selectPoultryType,
        minimumNumberOfBirds,
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: poultryClaimRoutes.minimumNumberOfBirds,
  options: {
    validate: {
      payload: Joi.object({
        minimumNumberOfBirds: Joi.string().required(),
      }),
      failAction: async (request, h, error) => {
        request.logger.error({ error });

        return h
          .view(poultryClaimViews.minimumNumberOfBirds, {
            ...request.payload,
            errorMessage: {
              text: `Select one option`,
              href: "#minimumNumberOfBirds",
            },
            backLink: poultryClaimRoutes.selectPoultryType,
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
        { shouldEmitEvent: false },
      );

      if (minimumNumberOfBirds === "yes") {
        return h.redirect(poultryClaimRoutes.vetName);
      } else {
        return h.view(poultryClaimViews.minimumNumberOfBirdsException);
      }
    },
  },
};

export const poultryMinimumNumberOfBirdsHandlers = [getHandler, postHandler];

import Joi from "joi";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../session/index.js";
import { thresholds } from "../../constants/claim-constants.js";
import HttpStatus from "http-status-codes";
import { claimRoutes, claimViews } from "../../constants/routes.js";

const getHandler = {
  method: "GET",
  path: "/number-of-fluid-oral-samples",
  options: {
    handler: async (request, h) => {
      const numberOfOralFluidSamples = getSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.numberOfOralFluidSamples,
      );

      return h.view(claimViews.numberOfFluidOralSamples, {
        numberOfOralFluidSamples,
        backLink: claimRoutes.testUrn,
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: "/number-of-fluid-oral-samples",
  options: {
    validate: {
      payload: Joi.object({
        numberOfOralFluidSamples: Joi.string().pattern(/^\d+$/).max(4).required().messages({
          "string.base": "Enter the number of oral fluid samples",
          "string.empty": "Enter the number of oral fluid samples",
          "string.max": "The number of oral fluid samples should not exceed 9999",
          "string.pattern.base": "The amount of oral fluid samples must only include numbers",
        }),
      }),
      failAction: async (request, h, err) => {
        request.logger.setBindings({ error: err });

        return h
          .view(claimViews.numberOfFluidOralSamples, {
            ...request.payload,
            errorMessage: { text: err.details[0].message, href: "#numberOfOralFluidSamples" },
            backLink: claimRoutes.testUrn,
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      },
    },
    handler: async (request, h) => {
      const { numberOfOralFluidSamples } = request.payload;

      await setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.numberOfOralFluidSamples,
        numberOfOralFluidSamples,
      );

      if (numberOfOralFluidSamples < thresholds.minimumNumberFluidOralSamples) {
        // TODO - raise invalid data event

        return h
          .view(claimViews.numberOfFluidOralSamplesException, {
            backLink: claimRoutes.numberOfFluidOralSamples,
            minimumNumberFluidOralSamples: thresholds.minimumNumberFluidOralSamples,
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      }

      return h.redirect(claimRoutes.testResults);
    },
  },
};

export const numberOfOralFluidSamplesHandlers = [getHandler, postHandler];

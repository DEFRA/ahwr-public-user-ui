import Joi from "joi";
import HttpStatus from "http-status-codes";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../session/index.js";
import { claimRoutes, claimViews } from "../../constants/routes.js";
import { sendInvalidDataEvent } from "../../messaging/ineligibility-event-emission.js";
import { thresholds } from "../../constants/claim-constants.js";

const ENTER_NUM_BLOOD_SAMPLES = "Enter the number of blood samples";

const { endemicsClaim: endemicsClaimEntry } = sessionEntryKeys;
const {
  endemicsClaim: { numberOfBloodSamples: numberOfBloodSamplesKey },
} = sessionKeys;
const { requiredNumberBloodSamples } = thresholds;

const getHandler = {
  method: "GET",
  path: claimRoutes.numberOfBloodSamples,
  options: {
    handler: async (request, h) => {
      const numberOfBloodSamples = getSessionData(
        request,
        endemicsClaimEntry,
        numberOfBloodSamplesKey,
      );

      return h.view(claimViews.numberOfBloodSamples, {
        numberOfBloodSamples,
        backLink: claimRoutes.typeOfSamplesTaken,
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: claimRoutes.numberOfBloodSamples,
  options: {
    validate: {
      payload: Joi.object({
        numberOfBloodSamples: Joi.number().empty("").required().messages({
          "any.required": ENTER_NUM_BLOOD_SAMPLES,
          "number.empty": ENTER_NUM_BLOOD_SAMPLES,
          "number.base": "The amount of blood samples must only include numbers",
        }),
      }),
      failAction: async (request, h, err) => {
        request.logger.setBindings({ err });
        return h
          .view(claimViews.numberOfBloodSamples, {
            ...request.payload,
            errorMessage: { text: err.details[0].message, href: `#${numberOfBloodSamplesKey}` },
            backLink: claimRoutes.typeOfSamplesTaken,
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      },
    },
    handler: async (request, h) => {
      const { numberOfBloodSamples } = request.payload;

      await setSessionData(
        request,
        endemicsClaimEntry,
        numberOfBloodSamplesKey,
        numberOfBloodSamples,
      );

      if (numberOfBloodSamples !== requiredNumberBloodSamples) {
        sendInvalidDataEvent({
          request,
          sessionKey: numberOfBloodSamplesKey,
          exception: `Value ${numberOfBloodSamples} is not exactly ${requiredNumberBloodSamples}`,
        });
        return h
          .view(claimViews.numberOfBloodSamplesException, {
            backLink: claimRoutes.numberOfBloodSamples,
            requiredNumberBloodSamples,
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      }

      return h.redirect(claimRoutes.testResults);
    },
  },
};

export const numberOfBloodSamplesHandlers = [getHandler, postHandler];

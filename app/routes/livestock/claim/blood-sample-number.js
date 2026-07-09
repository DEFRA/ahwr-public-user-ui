import Joi from "joi";
import HttpStatus from "http-status-codes";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../../session/index.js";
import { livestockClaimRoutes, livestockClaimViews } from "../../../constants/routes.js";
import { sendInvalidDataEvent } from "../../../messaging/ineligibility-event-emission.js";
import { thresholds } from "../../../constants/claim-constants.js";

const ENTER_NUM_BLOOD_SAMPLES = "Enter the number of blood samples";

const { endemicsClaim: endemicsClaimEntry } = sessionEntryKeys;
const {
  endemicsClaim: { numberOfBloodSamples: numberOfBloodSamplesKey },
} = sessionKeys;
const { requiredNumberBloodSamples } = thresholds;

const getHandler = {
  method: "GET",
  path: livestockClaimRoutes.numberOfBloodSamples,
  options: {
    handler: async (request, h) => {
      const numberOfBloodSamples = getSessionData(
        request,
        endemicsClaimEntry,
        numberOfBloodSamplesKey,
      );

      return h.view(livestockClaimViews.numberOfBloodSamples, {
        numberOfBloodSamples,
        backLink: livestockClaimRoutes.typeOfSamplesTaken,
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: livestockClaimRoutes.numberOfBloodSamples,
  options: {
    validate: {
      payload: Joi.object({
        numberOfBloodSamples: Joi.number().empty("").required().messages({
          "any.required": ENTER_NUM_BLOOD_SAMPLES,
          "number.empty": ENTER_NUM_BLOOD_SAMPLES,
          "number.base": "The amount of blood samples must only include numbers",
        }),
      }),
      failAction: async (request, h, error) => {
        request.logger.error({ error });
        return h
          .view(livestockClaimViews.numberOfBloodSamples, {
            ...request.payload,
            errorMessage: { text: error.details[0].message, href: `#${numberOfBloodSamplesKey}` },
            backLink: livestockClaimRoutes.typeOfSamplesTaken,
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
          .view(livestockClaimViews.numberOfBloodSamplesException, {
            backLink: livestockClaimRoutes.numberOfBloodSamples,
            requiredNumberBloodSamples,
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      }

      return h.redirect(livestockClaimRoutes.testResults);
    },
  },
};

export const numberOfBloodSamplesHandlers = [getHandler, postHandler];

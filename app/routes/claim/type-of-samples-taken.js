import Joi from "joi";
import HttpStatus from "http-status-codes";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../session/index.js";
import { claimRoutes, claimViews } from "../../constants/routes.js";
import { PIGS_SAMPLE_TYPES } from "../../constants/claim-constants.js";

const { oralFluid, blood } = PIGS_SAMPLE_TYPES;

const { endemicsClaim: endemicsClaimEntry } = sessionEntryKeys;
const {
  endemicsClaim: {
    typeOfSamplesTaken: typeOfSamplesTakenKey,
    numberOfOralFluidSamples: numberOfOralFluidSamplesKey,
    numberOfBloodSamples: numberOfBloodSamplesKey,
  },
} = sessionKeys;

const getHandler = {
  method: "GET",
  path: claimRoutes.typeOfSamplesTaken,
  options: {
    handler: async (request, h) => {
      const typeOfSamplesTaken = getSessionData(request, endemicsClaimEntry, typeOfSamplesTakenKey);

      return h.view(claimViews.typeOfSamplesTaken, {
        previousAnswer: typeOfSamplesTaken,
        backLink: claimRoutes.testUrn,
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: claimRoutes.typeOfSamplesTaken,
  options: {
    validate: {
      payload: Joi.object({
        typeOfSamplesTaken: Joi.string()
          .valid(oralFluid, blood)
          .required()
          .messages({ "any.required": "Select what type of samples where taken" }),
      }),
      failAction: async (request, h, err) => {
        request.logger.setBindings({ err });
        return h
          .view(claimViews.typeOfSamplesTaken, {
            ...request.payload,
            errorMessage: { text: err.details[0].message, href: `#${typeOfSamplesTakenKey}` },
            backLink: claimRoutes.testUrn,
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      },
    },
    handler: async (request, h) => {
      const oldValue = getSessionData(request, endemicsClaimEntry, typeOfSamplesTakenKey);
      const { typeOfSamplesTaken } = request.payload;

      await setSessionData(request, endemicsClaimEntry, typeOfSamplesTakenKey, typeOfSamplesTaken);

      // type of samples changed so reset oral fluid and blood
      if (typeOfSamplesTaken !== oldValue) {
        await setSessionData(request, endemicsClaimEntry, numberOfOralFluidSamplesKey, undefined, {
          shouldEmitEvent: false,
        });
        await setSessionData(request, endemicsClaimEntry, numberOfBloodSamplesKey, undefined, {
          shouldEmitEvent: false,
        });
      }

      const nextPage =
        typeOfSamplesTaken === oralFluid
          ? claimRoutes.numberOfFluidOralSamples
          : claimRoutes.numberOfBloodSamples;
      return h.redirect(nextPage);
    },
  },
};

export const typeOfSamplesTakenHandlers = [getHandler, postHandler];

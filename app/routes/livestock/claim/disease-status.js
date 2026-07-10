import Joi from "joi";
import { claimConstants } from "../../../constants/claim-constants.js";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../../session/index.js";
import HttpStatus from "http-status-codes";
import { livestockClaimRoutes, livestockClaimViews } from "../../../constants/routes.js";

const getHandler = {
  method: "GET",
  path: livestockClaimRoutes.diseaseStatus,
  options: {
    handler: async (request, h) => {
      const endemicsClaimData = getSessionData(request, sessionEntryKeys.endemicsClaim);

      return h.view(livestockClaimViews.diseaseStatus, {
        ...(endemicsClaimData.diseaseStatus && {
          previousAnswer: endemicsClaimData.diseaseStatus,
        }),
        backLink: livestockClaimRoutes.numberOfSamplesTested,
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: livestockClaimRoutes.diseaseStatus,
  options: {
    validate: {
      payload: Joi.object({
        diseaseStatus: Joi.string()
          .valid(...Object.values(claimConstants.diseaseStatusTypes))
          .required(),
      }),
      failAction: (_request, h, _err) => {
        return h
          .view(livestockClaimViews.diseaseStatus, {
            errorMessage: { text: "Enter the disease status category" },
            backLink: livestockClaimRoutes.numberOfSamplesTested,
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      },
    },
    handler: async (request, h) => {
      const { diseaseStatus } = request.payload;

      await setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.diseaseStatus,
        diseaseStatus,
      );

      return h.redirect(livestockClaimRoutes.biosecurity);
    },
  },
};

export const diseaseStatusHandlers = [getHandler, postHandler];

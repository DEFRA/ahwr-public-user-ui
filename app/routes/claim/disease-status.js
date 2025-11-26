import Joi from "joi";
import { claimConstants } from "../../constants/claim-constants.js";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../session/index.js";
import HttpStatus from "http-status-codes";
import { claimRoutes, claimViews } from "../../constants/routes.js";

const getHandler = {
  method: "GET",
  path: "/disease-status",
  options: {
    handler: async (request, h) => {
      const endemicsClaimData = getSessionData(request, sessionEntryKeys.endemicsClaim);

      return h.view(claimViews.diseaseStatus, {
        ...(endemicsClaimData.diseaseStatus && {
          previousAnswer: endemicsClaimData.diseaseStatus,
        }),
        backLink: claimRoutes.numberOfSamplesTested,
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: "/disease-status",
  options: {
    validate: {
      payload: Joi.object({
        diseaseStatus: Joi.string()
          .valid(...Object.values(claimConstants.diseaseStatusTypes))
          .required(),
      }),
      failAction: (_request, h, _err) => {
        return h
          .view(claimViews.diseaseStatus, {
            errorMessage: { text: "Enter the disease status category" },
            backLink: claimRoutes.numberOfSamplesTested,
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

      return h.redirect(claimRoutes.biosecurity);
    },
  },
};

export const diseaseStatusHandlers = [getHandler, postHandler];

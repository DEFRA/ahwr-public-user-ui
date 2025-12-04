import Joi from "joi";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../session/index.js";
import HttpStatus from "http-status-codes";
import { claimConstants } from "../../constants/claim-constants.js";
import { claimRoutes, claimViews } from "../../constants/routes.js";

const getHandler = {
  method: "GET",
  path: "/pigs-pcr-result",
  options: {
    handler: async (request, h) => {
      const testResult = getSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.pigsPcrTestResult,
      );

      return h.view(claimViews.pigsPcrResult, {
        previousAnswer: testResult,
        backLink: claimRoutes.numberOfSamplesTested,
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: "/pigs-pcr-result",
  options: {
    validate: {
      payload: Joi.object({
        pcrResult: Joi.string()
          .valid(claimConstants.result.negative, claimConstants.result.positive)
          .required(),
      }),
      failAction: (_request, h, _err) => {
        const errorMessage = { text: "Select the result of the test" };

        return h
          .view(claimViews.pigsPcrResult, {
            errorMessage,
            backLink: claimRoutes.numberOfSamplesTested,
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      },
    },
    handler: async (request, h) => {
      const { pcrResult } = request.payload;

      await setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.pigsPcrTestResult,
        pcrResult,
      );

      if (pcrResult === claimConstants.result.positive) {
        return h.redirect(claimRoutes.pigsGeneticSequencing);
      }

      // Clearing this from the session in-case they filled it out, then went back.
      // Not emitting because its just clearing that part of the session
      await setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.pigsGeneticSequencing,
        undefined,
      );

      return h.redirect(claimRoutes.biosecurity);
    },
  },
};

export const pigsPcrResultHandlers = [getHandler, postHandler];

import Joi from "joi";
import { isVisitDateAfterPIHuntAndDairyGoLive } from "../../lib/context-helper.js";
import HttpStatus from "http-status-codes";
import {
  getSessionData,
  sessionEntryKeys,
  sessionKeys,
  setSessionData,
} from "../../session/index.js";
import { getEndemicsClaimDetails, getTestResult } from "../../lib/utils.js";
import { claimRoutes, claimViews } from "../../constants/routes.js";
import { claimType } from "ffc-ahwr-common-library";

const errorMessages = {
  enterRCVS: "Enter an RCVS number",
  validRCVS: "An RCVS number is a 7 digit number or a 6 digit number ending in a letter.",
};

const nextPageURL = (request) => {
  const { typeOfLivestock, typeOfReview, relevantReviewForEndemics } = getSessionData(
    request,
    sessionEntryKeys.endemicsClaim,
  );
  const { isBeef, isDairy, isPigs, isSheep, isEndemicsFollowUp } = getEndemicsClaimDetails(
    typeOfLivestock,
    typeOfReview,
  );

  if (isEndemicsFollowUp) {
    if (relevantReviewForEndemics.type === claimType.vetVisits && isPigs) {
      return claimRoutes.vetVisitsReviewTestResults;
    }
    if (isSheep) {
      return claimRoutes.sheepEndemicsPackage;
    }
    if (isBeef || isDairy) {
      return claimRoutes.testUrn;
    }
    if (isPigs) {
      return claimRoutes.vaccination;
    }
  }

  return claimRoutes.testUrn;
};

const getHandler = {
  method: "GET",
  path: claimRoutes.vetRcvs,
  options: {
    handler: async (request, h) => {
      const { vetRCVSNumber } = getSessionData(request, sessionEntryKeys.endemicsClaim);
      return h.view(claimViews.vetRcvs, {
        vetRCVSNumber,
        backLink: claimRoutes.vetName,
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: claimRoutes.vetRcvs,
  options: {
    validate: {
      payload: Joi.object({
        vetRCVSNumber: Joi.string()
          .trim()
          .pattern(/^\d{6}[\dX]$/i)
          .required()
          .messages({
            "any.required": errorMessages.enterRCVS,
            "string.base": errorMessages.enterRCVS,
            "string.empty": errorMessages.enterRCVS,
            "string.pattern.base": errorMessages.validRCVS,
          }),
      }),
      failAction: async (request, h, error) => {
        request.logger.error({ error });
        return h
          .view(claimViews.vetRcvs, {
            ...request.payload,
            backLink: claimRoutes.vetName,
            errorMessage: {
              text: error.details[0].message,
              href: `#${sessionKeys.endemicsClaim.vetRCVSNumber}`,
            },
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      },
    },
    handler: async (request, h) => {
      const { vetRCVSNumber } = request.payload;
      const { dateOfVisit, reviewTestResults, typeOfLivestock, typeOfReview } = getSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
      );
      const { isBeef, isDairy, isBeefOrDairyEndemics } = getEndemicsClaimDetails(
        typeOfLivestock,
        typeOfReview,
      );
      const { isNegative, isPositive } = getTestResult(reviewTestResults);

      await setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.vetRCVSNumber,
        vetRCVSNumber,
      );

      if (isVisitDateAfterPIHuntAndDairyGoLive(dateOfVisit) && isBeefOrDairyEndemics) {
        return h.redirect(claimRoutes.piHunt);
      }

      if (isBeef || isDairy) {
        if (isPositive) {
          return h.redirect(claimRoutes.piHunt);
        }
        if (isNegative) {
          return h.redirect(claimRoutes.biosecurity);
        }
      }

      return h.redirect(nextPageURL(request));
    },
  },
};

export const vetRCVSHandlers = [getHandler, postHandler];

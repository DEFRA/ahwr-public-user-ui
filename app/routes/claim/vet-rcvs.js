import Joi from "joi";
import { errorMessages } from "../../lib/error-messages.js";
import { claimConstants } from "../../constants/claim-constants.js";
import links from "../../config/routes.js";
import { getEndemicsClaim, setEndemicsClaim } from "../../session/index.js";
import { sessionKeys } from "../../session/keys.js";
import { getTestResult } from "../../lib/get-test-result.js";
import { isVisitDateAfterPIHuntAndDairyGoLive } from "../../lib/context-helper.js";
import HttpStatus from "http-status-codes";
import { getEndemicsClaimDetails, prefixUrl } from "../utils/page-utils.js";

const { rcvs: rcvsErrorMessages } = errorMessages;
const { claimType } = claimConstants;

const {
  endemicsVetName,
  endemicsVetRCVS,
  endemicsTestUrn,
  endemicsVaccination,
  endemicsBiosecurity,
  endemicsPIHunt,
  endemicsSheepEndemicsPackage,
  endemicsVetVisitsReviewTestResults,
} = links;
const {
  endemicsClaim: { vetRCVSNumber: vetRCVSNumberKey, dateOfVisit: dateOfVisitKey },
} = sessionKeys;

const pageUrl = prefixUrl(endemicsVetRCVS);
const backLink = prefixUrl(endemicsVetName);

const nextPageURL = (request) => {
  const { typeOfLivestock, typeOfReview, relevantReviewForEndemics } = getEndemicsClaim(request);
  const { isBeef, isDairy, isPigs, isSheep, isEndemicsFollowUp } = getEndemicsClaimDetails(
    typeOfLivestock,
    typeOfReview,
  );

  if (isEndemicsFollowUp) {
    if (relevantReviewForEndemics.type === claimType.vetVisits && isPigs) {
      return prefixUrl(endemicsVetVisitsReviewTestResults);
    }
    if (isSheep) {
      return prefixUrl(endemicsSheepEndemicsPackage);
    }
    if (isBeef || isDairy) {
      return prefixUrl(endemicsTestUrn);
    }
    if (isPigs) {
      return prefixUrl(endemicsVaccination);
    }
  }

  return prefixUrl(endemicsTestUrn);
};

const getHandler = {
  method: "GET",
  path: pageUrl,
  options: {
    handler: async (request, h) => {
      const { vetRCVSNumber } = getEndemicsClaim(request);
      return h.view(endemicsVetRCVS, {
        vetRCVSNumber,
        backLink,
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: pageUrl,
  options: {
    validate: {
      payload: Joi.object({
        vetRCVSNumber: Joi.string()
          .trim()
          .pattern(/^\d{6}[\dX]$/i)
          .required()
          .messages({
            "any.required": rcvsErrorMessages.enterRCVS,
            "string.base": rcvsErrorMessages.enterRCVS,
            "string.empty": rcvsErrorMessages.enterRCVS,
            "string.pattern.base": rcvsErrorMessages.validRCVS,
          }),
      }),
      failAction: async (request, h, err) => {
        request.logger.setBindings({ err });
        return h
          .view(endemicsVetRCVS, {
            ...request.payload,
            backLink,
            errorMessage: { text: err.details[0].message, href: `#${vetRCVSNumberKey}` },
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      },
    },
    handler: async (request, h) => {
      const { vetRCVSNumber } = request.payload;
      const { reviewTestResults, typeOfLivestock, typeOfReview } = getEndemicsClaim(request);
      const { isBeef, isDairy, isBeefOrDairyEndemics } = getEndemicsClaimDetails(
        typeOfLivestock,
        typeOfReview,
      );
      const { isNegative, isPositive } = getTestResult(reviewTestResults);

      setEndemicsClaim(request, vetRCVSNumberKey, vetRCVSNumber);

      if (
        isVisitDateAfterPIHuntAndDairyGoLive(getEndemicsClaim(request, dateOfVisitKey)) &&
        isBeefOrDairyEndemics
      ) {
        return h.redirect(prefixUrl(endemicsPIHunt));
      }

      if (isBeef || isDairy) {
        if (isPositive) {
          return h.redirect(prefixUrl(endemicsPIHunt));
        }
        if (isNegative) {
          return h.redirect(prefixUrl(endemicsBiosecurity));
        }
      }

      return h.redirect(nextPageURL(request));
    },
  },
};

export const vetRCVSHandlers = [getHandler, postHandler];

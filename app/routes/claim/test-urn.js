import Joi from 'joi'
import {
  getSessionData,
  sessionEntryKeys,
  sessionKeys, setSessionData
} from "../../session/index.js";
import { isVisitDateAfterPIHuntAndDairyGoLive } from '../../lib/context-helper.js'
import HttpStatus from 'http-status-codes'
import { getEndemicsClaimDetails, getTestResult } from "../../lib/utils.js";
import { claimRoutes, claimViews } from "../../constants/routes.js";
import { isURNUnique } from "../../api-requests/claim-api.js";

const ENTER_THE_URN = 'Enter the URN'
const MAX_URN_LENGTH = 50

const title = (request) => {
  const { typeOfLivestock, typeOfReview } = getSessionData(request, sessionEntryKeys.endemicsClaim);
  const { isBeefOrDairyEndemics } = getEndemicsClaimDetails(typeOfLivestock, typeOfReview)

  if (isBeefOrDairyEndemics) {
    return 'What’s the laboratory unique reference number (URN) or certificate number of the test results?'
  }

  return 'What’s the laboratory unique reference number (URN) for the test results?'
}

const previousPageUrl = (request) => {
  const { typeOfLivestock, typeOfReview, reviewTestResults, dateOfVisit } = getSessionData(request, sessionEntryKeys.endemicsClaim);
  const { isEndemicsFollowUp, isBeefOrDairyEndemics, isReview, isBeef, isDairy, isPigs } = getEndemicsClaimDetails(typeOfLivestock, typeOfReview)
  const { isPositive } = getTestResult(reviewTestResults)

  if (isVisitDateAfterPIHuntAndDairyGoLive(dateOfVisit) && isBeefOrDairyEndemics) {
    return claimRoutes.dateOfTesting;
  }
  if (isReview) {
    return claimRoutes.vetRcvs;
  }
  if (isEndemicsFollowUp && isPigs) {
    return claimRoutes.vaccination;
  }
  if ((isBeef || isDairy) && isPositive) {
    return claimRoutes.piHunt;
  }

  return claimRoutes.vetRcvs;
}

const nextPageUrl = (request) => {
  const { typeOfLivestock, typeOfReview } = getSessionData(request, sessionEntryKeys.endemicsClaim);
  const { isBeef, isDairy, isPigs, isReview, isEndemicsFollowUp } = getEndemicsClaimDetails(typeOfLivestock, typeOfReview)

  if (isPigs && isReview) {
    return claimRoutes.numberOfFluidOralSamples;
  }
  if (isPigs && isEndemicsFollowUp) {
    return claimRoutes.numberOfSamplesTested;
  }
  if (isBeef || isDairy) {
    return claimRoutes.testResults;
  }

  return claimRoutes.checkAnswers;
}

const getHandler = {
  method: 'GET',
  path: claimRoutes.testUrn,
  options: {
    handler: async (request, h) => {
      const { laboratoryURN } = getSessionData(request, sessionEntryKeys.endemicsClaim);
      return h.view(claimViews.testUrn, {
        title: title(request),
        laboratoryURN,
        backLink: previousPageUrl(request)
      })
    }
  }
}

const postHandler = {
  method: 'POST',
  path: claimRoutes.testUrn,
  options: {
    validate: {
      payload: Joi.object({
        laboratoryURN: Joi.string()
          .trim()
          .max(MAX_URN_LENGTH)
          .pattern(/^[A-Za-z0-9-]+$/)
          .required()
          .messages({
            'any.required': ENTER_THE_URN,
            'string.base': ENTER_THE_URN,
            'string.empty': ENTER_THE_URN,
            'string.max': 'URN must be 50 characters or fewer',
            'string.pattern.base': 'URN must only include letters a to z, numbers and a hyphen'
          })
      }),
      failAction: async (request, h, err) => {
        request.logger.setBindings({ err })
        const { typeOfLivestock, typeOfReview } = getSessionData(request, sessionEntryKeys.endemicsClaim);
        const { isBeefOrDairyEndemics } = getEndemicsClaimDetails(typeOfLivestock, typeOfReview)
        const errorMessage = (err.details[0].message === ENTER_THE_URN && isBeefOrDairyEndemics) ? 'Enter the URN or certificate number' : err.details[0].message
        return h
          .view(claimViews.testUrn, {
            ...request.payload,
            title: title(request),
            errorMessage: { text: errorMessage, href: '#laboratoryURN' },
            backLink: previousPageUrl(request)
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover()
      }
    },
    handler: async (request, h) => {
      const { laboratoryURN } = request.payload
      const { organisation, typeOfLivestock, typeOfReview } = getSessionData(request, sessionEntryKeys.endemicsClaim);
      const { isBeefOrDairyEndemics } = getEndemicsClaimDetails(typeOfLivestock, typeOfReview)
      const response = await isURNUnique({ sbi: organisation.sbi, laboratoryURN }, request.logger)
      // TODO: Should emit event
      setSessionData(request, sessionEntryKeys.endemicsClaim, sessionKeys.endemicsClaim.laboratoryURN, laboratoryURN);

      if (!response?.isURNUnique) {
        // TODO: raise invalid data event here
        // raiseInvalidDataEvent(request, laboratoryURNKey, 'urnReference entered is not unique')
        return h.view(claimViews.testUrnException, { backLink: claimRoutes.testUrn, isBeefOrDairyEndemics }).code(HttpStatus.BAD_REQUEST).takeover()
      }

      return h.redirect(nextPageUrl(request))
    }
  }
}

export const testUrnHandlers = [getHandler, postHandler]

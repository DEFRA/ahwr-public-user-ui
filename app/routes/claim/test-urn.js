import Joi from 'joi'
import links from '../../config/routes.js'
import { sessionKeys } from '../../session/keys.js'
import { getEndemicsClaim, setEndemicsClaim } from '../../session/index.js'
import { getTestResult } from '../../lib/get-test-result.js'
import { raiseInvalidDataEvent } from '../../event/raise-invalid-data-event.js'
import { isURNUnique } from '../../api-requests/claim-service-api.js'
import { isVisitDateAfterPIHuntAndDairyGoLive } from '../../lib/context-helper.js'
import HttpStatus from 'http-status-codes'
import { getEndemicsClaimDetails, prefixUrl } from '../utils/page-utils.js'

const {
  endemicsVetRCVS,
  endemicsCheckAnswers,
  endemicsTestUrn,
  endemicsVaccination,
  endemicsTestUrnException,
  endemicsNumberOfOralFluidSamples,
  endemicsNumberOfSamplesTested,
  endemicsTestResults,
  endemicsPIHunt,
  endemicsDateOfTesting
} = links
const {
  endemicsClaim: { laboratoryURN: laboratoryURNKey, dateOfVisit: dateOfVisitKey }
} = sessionKeys

const ENTER_THE_URN = 'Enter the URN'
const MAX_URN_LENGTH = 50

const pageUrl = prefixUrl(endemicsTestUrn)

const title = (request) => {
  const { typeOfLivestock, typeOfReview } = getEndemicsClaim(request)
  const { isBeefOrDairyEndemics } = getEndemicsClaimDetails(typeOfLivestock, typeOfReview)

  if (isBeefOrDairyEndemics) {
    return 'What’s the laboratory unique reference number (URN) or certificate number of the test results?'
  }

  return 'What’s the laboratory unique reference number (URN) for the test results?'
}

const previousPageUrl = (request) => {
  const { typeOfLivestock, typeOfReview, reviewTestResults } = getEndemicsClaim(request)
  const { isEndemicsFollowUp, isBeefOrDairyEndemics, isReview, isBeef, isDairy, isPigs } = getEndemicsClaimDetails(typeOfLivestock, typeOfReview)
  const { isPositive } = getTestResult(reviewTestResults)

  if (isVisitDateAfterPIHuntAndDairyGoLive(getEndemicsClaim(request, dateOfVisitKey)) && isBeefOrDairyEndemics) {
    return prefixUrl(endemicsDateOfTesting)
  }
  if (isReview) {
    return prefixUrl(endemicsVetRCVS)
  }
  if (isEndemicsFollowUp && isPigs) {
    return prefixUrl(endemicsVaccination)
  }
  if ((isBeef || isDairy) && isPositive) {
    return prefixUrl(endemicsPIHunt)
  }

  return prefixUrl(endemicsVetRCVS)
}

const nextPageUrl = (request) => {
  const { typeOfLivestock, typeOfReview } = getEndemicsClaim(request)
  const { isBeef, isDairy, isPigs, isReview, isEndemicsFollowUp } = getEndemicsClaimDetails(typeOfLivestock, typeOfReview)

  if (isPigs && isReview) {
    return prefixUrl(endemicsNumberOfOralFluidSamples)
  }
  if (isPigs && isEndemicsFollowUp) {
    return prefixUrl(endemicsNumberOfSamplesTested)
  }
  if (isBeef || isDairy) {
    return prefixUrl(endemicsTestResults)
  }

  return prefixUrl(endemicsCheckAnswers)
}

const getHandler = {
  method: 'GET',
  path: pageUrl,
  options: {
    handler: async (request, h) => {
      const { laboratoryURN } = getEndemicsClaim(request)
      return h.view(endemicsTestUrn, {
        title: title(request),
        laboratoryURN,
        backLink: previousPageUrl(request)
      })
    }
  }
}

const postHandler = {
  method: 'POST',
  path: pageUrl,
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
        const { typeOfLivestock, typeOfReview } = getEndemicsClaim(request)
        const { isBeefOrDairyEndemics } = getEndemicsClaimDetails(typeOfLivestock, typeOfReview)
        const errorMessage = (err.details[0].message === ENTER_THE_URN && isBeefOrDairyEndemics) ? 'Enter the URN or certificate number' : err.details[0].message
        return h
          .view(endemicsTestUrn, {
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
      const { organisation, typeOfLivestock, typeOfReview } = getEndemicsClaim(request)
      const { isBeefOrDairyEndemics } = getEndemicsClaimDetails(typeOfLivestock, typeOfReview)
      const response = await isURNUnique({ sbi: organisation.sbi, laboratoryURN }, request.logger)
      setEndemicsClaim(request, laboratoryURNKey, laboratoryURN)

      if (!response?.isURNUnique) {
        raiseInvalidDataEvent(request, laboratoryURNKey, 'urnReference entered is not unique')
        return h.view(endemicsTestUrnException, { backLink: pageUrl, isBeefOrDairyEndemics }).code(HttpStatus.BAD_REQUEST).takeover()
      }

      return h.redirect(nextPageUrl(request))
    }
  }
}

export const testUrnHandlers = [getHandler, postHandler]

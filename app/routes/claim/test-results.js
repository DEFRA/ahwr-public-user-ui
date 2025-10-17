import Joi from 'joi'
import links from '../../config/routes.js'
import { sessionKeys } from '../../session/keys.js'
import { getEndemicsClaim, setEndemicsClaim } from '../../session/index.js'
import { getReviewType } from '../../lib/get-review-type.js'
import { radios } from '../models/form-component/radios.js'
import HttpStatus from 'http-status-codes'
import { getEndemicsClaimDetails, prefixUrl } from '../utils/page-utils.js'

const {
  endemicsTestResults,
  endemicsCheckAnswers,
  endemicsTestUrn,
  endemicsDiseaseStatus,
  endemicsBiosecurity,
  endemicsNumberOfOralFluidSamples
} = links
const { endemicsClaim: { testResults: testResultsKey } } = sessionKeys

const pageUrl = prefixUrl(endemicsTestResults)
const previousPageUrl = (request) => {
  const { typeOfLivestock, typeOfReview } = getEndemicsClaim(request)
  const { isBeef, isDairy, isSheep, isPigs, isEndemicsFollowUp } = getEndemicsClaimDetails(typeOfLivestock, typeOfReview)

  if (isEndemicsFollowUp) {
    if (isSheep) {
      return prefixUrl(endemicsDiseaseStatus)
    }
    if (isBeef || isDairy) {
      return prefixUrl(endemicsTestUrn)
    }
  }

  if (isPigs) {
    return prefixUrl(endemicsNumberOfOralFluidSamples)
  }
  if (isBeef || isDairy) {
    return prefixUrl(endemicsTestUrn)
  }

  return undefined // if a review, and is for sheep, what should back page be? Can this ever happen?
}
const nextPageURL = (request) => {
  const { typeOfLivestock, typeOfReview } = getEndemicsClaim(request)
  const { isBeefOrDairyEndemics } = getEndemicsClaimDetails(typeOfLivestock, typeOfReview)

  if (isBeefOrDairyEndemics) {
    return prefixUrl(endemicsBiosecurity)
  }

  return prefixUrl(endemicsCheckAnswers)
}
const pageTitle = (request) => {
  const { typeOfReview } = getEndemicsClaim(request)
  const { isEndemicsFollowUp } = getReviewType(typeOfReview)
  return isEndemicsFollowUp ? 'What was the follow-up test result?' : 'What was the test result?'
}

const hintHtml = 'You can find this on the summary the vet gave you.'

const getHandler = {
  method: 'GET',
  path: pageUrl,
  options: {
    handler: async (request, h) => {
      const { testResults } = getEndemicsClaim(request)
      const positiveNegativeRadios = radios(pageTitle(request), 'testResults', undefined, { hintHtml })([{ value: 'positive', text: 'Positive', checked: testResults === 'positive' }, { value: 'negative', text: 'Negative', checked: testResults === 'negative' }])
      return h.view(endemicsTestResults, { backLink: previousPageUrl(request), title: pageTitle(request), ...positiveNegativeRadios })
    }
  }
}

const postHandler = {
  method: 'POST',
  path: pageUrl,
  options: {
    validate: {
      payload: Joi.object({
        testResults: Joi.string().valid('positive', 'negative').required()
      }),
      failAction: async (request, h, err) => {
        request.logger.setBindings({ err })
        const positiveNegativeRadios = radios(pageTitle(request), 'testResults', 'Select a test result', { hintHtml })([{ value: 'positive', text: 'Positive' }, { value: 'negative', text: 'Negative' }])
        return h.view(endemicsTestResults, {
          ...request.payload,
          title: pageTitle(request),
          backLink: previousPageUrl(request),
          ...positiveNegativeRadios,
          errorMessage: {
            text: 'Select a test result',
            href: '#testResults'
          }
        }).code(HttpStatus.BAD_REQUEST).takeover()
      }
    },
    handler: async (request, h) => {
      const { testResults } = request.payload

      setEndemicsClaim(request, testResultsKey, testResults)
      return h.redirect(nextPageURL(request))
    }
  }
}

export const testResultsHandlers = [getHandler, postHandler]

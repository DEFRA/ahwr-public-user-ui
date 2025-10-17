import Joi from 'joi'
import links from '../../config/routes.js'
import { sessionKeys } from '../../session/keys.js'
import { getEndemicsClaim, setEndemicsClaim } from '../../session/index.js'
import { radios } from '../models/form-component/radios.js'
import { getLivestockTypes } from '../../lib/get-livestock-types.js'
import HttpStatus from 'http-status-codes'
import { prefixUrl } from '../utils/page-utils.js'

const {
  endemicsVetRCVS,
  endemicsVaccination,
  endemicsDateOfVisit,
  endemicsWhichTypeOfReview,
  endemicsVetVisitsReviewTestResults
} = links
const { endemicsClaim: { vetVisitsReviewTestResults: vetVisitsReviewTestResultsKey, reviewTestResults: reviewTestResultsKey } } = sessionKeys

const pageUrl = prefixUrl(endemicsVetVisitsReviewTestResults)

const previousPageUrl = (typeOfLivestock) => {
  const { isBeef, isDairy } = getLivestockTypes(typeOfLivestock)
  if (isBeef || isDairy) {
    return prefixUrl(endemicsWhichTypeOfReview)
  }
  return prefixUrl(endemicsVetRCVS)
}

const nextPageURL = (request) => {
  const { typeOfLivestock } = getEndemicsClaim(request)
  const { isBeef, isDairy } = getLivestockTypes(typeOfLivestock)

  if (isBeef || isDairy) {
    return prefixUrl(endemicsDateOfVisit)
  }
  return prefixUrl(endemicsVaccination)
}

const getHandler = {
  method: 'GET',
  path: pageUrl,
  options: {
    handler: async (request, h) => {
      const { vetVisitsReviewTestResults, typeOfLivestock } = getEndemicsClaim(request)
      const positiveNegativeRadios = radios('', 'vetVisitsReviewTestResults')([{ value: 'positive', text: 'Positive', checked: vetVisitsReviewTestResults === 'positive' }, { value: 'negative', text: 'Negative', checked: vetVisitsReviewTestResults === 'negative' }])
      return h.view(endemicsVetVisitsReviewTestResults, { typeOfLivestock, backLink: previousPageUrl(typeOfLivestock), ...positiveNegativeRadios })
    }
  }
}

const postHandler = {
  method: 'POST',
  path: pageUrl,
  options: {
    validate: {
      payload: Joi.object({
        vetVisitsReviewTestResults: Joi.string().valid('positive', 'negative').required()
      }),
      failAction: async (request, h, err) => {
        request.logger.setBindings({ err })
        const { typeOfLivestock } = getEndemicsClaim(request)
        const positiveNegativeRadios = radios('', 'vetVisitsReviewTestResults', 'Select a test result')([{ value: 'positive', text: 'Positive' }, { value: 'negative', text: 'Negative' }])
        return h.view(endemicsVetVisitsReviewTestResults, {
          ...request.payload,
          typeOfLivestock,
          backLink: previousPageUrl(typeOfLivestock),
          ...positiveNegativeRadios,
          errorMessage: {
            text: 'Select a test result',
            href: '#vetVisitsReviewTestResults'
          }
        }).code(HttpStatus.BAD_REQUEST)
          .takeover()
      }
    },
    handler: async (request, h) => {
      const { vetVisitsReviewTestResults } = request.payload

      setEndemicsClaim(request, vetVisitsReviewTestResultsKey, vetVisitsReviewTestResults)
      setEndemicsClaim(request, reviewTestResultsKey, vetVisitsReviewTestResults)

      return h.redirect(nextPageURL(request))
    }
  }
}

export const vetVisitsReviewTestResultsHandlers = [getHandler, postHandler]

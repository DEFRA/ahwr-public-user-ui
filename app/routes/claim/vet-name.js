import Joi from 'joi'
import { errorMessages } from '../../lib/error-messages.js'
import links from '../../config/routes.js'
import { sessionKeys } from '../../session/keys.js'
import { getEndemicsClaim, setEndemicsClaim } from '../../session/index.js'
import { getLivestockTypes } from '../../lib/get-livestock-types.js'
import { getReviewType } from '../../lib/get-review-type.js'
import HttpStatus from 'http-status-codes'
import { prefixUrl } from '../utils/page-utils.js'

const { name: nameErrorMessages } = errorMessages
const { endemicsNumberOfSpeciesTested, endemicsVetName, endemicsVetRCVS, endemicsSpeciesNumbers } = links
const {
  endemicsClaim: { vetsName: vetsNameKey }
} = sessionKeys

const MAX_VET_NAME_LENGTH = 50
const VET_NAME_PATTERN = /^[A-Za-z0-9&,' \-/()]+$/

const pageUrl = prefixUrl(endemicsVetName)
const backLink = (request) => {
  const { typeOfLivestock, typeOfReview } = getEndemicsClaim(request)
  const { isBeef, isDairy } = getLivestockTypes(typeOfLivestock)
  const { isEndemicsFollowUp } = getReviewType(typeOfReview)

  if (isDairy || (isBeef && isEndemicsFollowUp)) {
    return prefixUrl(endemicsSpeciesNumbers)
  }

  return prefixUrl(endemicsNumberOfSpeciesTested)
}

const getHandler = {
  method: 'GET',
  path: pageUrl,
  options: {
    handler: async (request, h) => {
      const { vetsName } = getEndemicsClaim(request)
      return h.view(endemicsVetName, {
        vetsName,
        backLink: backLink(request)
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
        vetsName: Joi.string()
          .trim()
          .max(MAX_VET_NAME_LENGTH)
          .pattern(VET_NAME_PATTERN)
          .required()
          .messages({
            'any.required': nameErrorMessages.enterName,
            'string.base': nameErrorMessages.enterName,
            'string.empty': nameErrorMessages.enterName,
            'string.max': nameErrorMessages.nameLength,
            'string.pattern.base': nameErrorMessages.namePattern
          })
      }),
      failAction: async (request, h, err) => {
        request.logger.setBindings({ err })
        return h
          .view(endemicsVetName, {
            ...request.payload,
            backLink: backLink(request),
            errorMessage: { text: err.details[0].message, href: `#${vetsNameKey}` }
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover()
      }
    },
    handler: async (request, h) => {
      const { vetsName } = request.payload
      setEndemicsClaim(request, vetsNameKey, vetsName)
      return h.redirect(prefixUrl(endemicsVetRCVS))
    }
  }
}

export const vetsNameHandlers = [getHandler, postHandler]

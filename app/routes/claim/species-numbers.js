import Joi from 'joi'
import links from '../../config/routes.js'
import { sessionKeys } from '../../session/keys.js'
import { getReviewType } from '../../lib/get-review-type.js'
import { getEndemicsClaim, setEndemicsClaim } from '../../session/index.js'
import { getSpeciesEligibleNumberForDisplay } from '../../lib/display-helpers.js'
import { getYesNoRadios } from '../models/form-component/yes-no-radios.js'
import { raiseInvalidDataEvent } from '../../event/raise-invalid-data-event.js'
import { getLivestockTypes } from '../../lib/get-livestock-types.js'
import { getTestResult } from '../../lib/get-test-result.js'
import { isMultipleHerdsUserJourney, isVisitDateAfterPIHuntAndDairyGoLive } from '../../lib/context-helper.js'
import { getHerdBackLink } from '../../lib/get-herd-back-link.js'
import HttpStatus from 'http-status-codes'
import { getEndemicsClaimDetails, prefixUrl } from '../utils/page-utils.js'

const {
  endemicsSpeciesNumbers,
  endemicsNumberOfSpeciesTested,
  endemicsSpeciesNumbersException,
  endemicsVetName,
  endemicsDateOfTesting,
  endemicsDateOfVisit
} = links
const { speciesNumbers, dateOfVisit: dateOfVisitKey } = sessionKeys.endemicsClaim

const backLink = (request) => {
  const { reviewTestResults, typeOfLivestock, typeOfReview, dateOfVisit, previousClaims, latestEndemicsApplication } = getEndemicsClaim(request)
  const { isBeefOrDairyEndemics, isBeef, isDairy } = getEndemicsClaimDetails(typeOfLivestock, typeOfReview)
  const { isNegative } = getTestResult(reviewTestResults)

  if (isMultipleHerdsUserJourney(dateOfVisit, latestEndemicsApplication.flags)) {
    return getHerdBackLink(typeOfLivestock, previousClaims)
  }

  if (isVisitDateAfterPIHuntAndDairyGoLive(getEndemicsClaim(request, dateOfVisitKey)) && isBeefOrDairyEndemics) {
    return prefixUrl(endemicsDateOfVisit)
  }
  if ((isDairy || isBeef) && isNegative) {
    return prefixUrl(endemicsDateOfVisit)
  }

  return prefixUrl(endemicsDateOfTesting)
}
const pageUrl = prefixUrl(endemicsSpeciesNumbers)
const hintHtml = 'You can find this on the summary the vet gave you.'

const radioOptions = { isPageHeading: true, legendClasses: 'govuk-fieldset__legend--l', inline: true, hintText: hintHtml }
const isEndemicsClaims = true
const sheepNumbersExceptionsText = {
  R: 'review',
  E: 'follow-up'
}
const getHerdText = (typeOfLivestock) => typeOfLivestock !== 'sheep' ? 'in this herd' : 'in this flock'
const errorMessageText = (typeOfReview, speciesEligibleNumberForDisplay, typeOfLivestock, dateOfVisit, latestEndemicsApplication) => {
  const { isReview } = getReviewType(typeOfReview)
  const claimTypeText = isReview ? 'review' : 'follow-up'
  const herdText = getHerdText(typeOfLivestock)

  return isMultipleHerdsUserJourney(dateOfVisit, latestEndemicsApplication.flags)
    ? `Select yes if you had ${speciesEligibleNumberForDisplay}${herdText} on the date of the ${claimTypeText}`
    : `Select yes if you had ${speciesEligibleNumberForDisplay} on the date of the ${claimTypeText}`
}
const legendText = (speciesEligibleNumberForDisplay, typeOfReview, typeOfLivestock, dateOfVisit, latestEndemicsApplication) => {
  const { isReview } = getReviewType(typeOfReview)
  const claimTypeText = isReview ? 'review' : 'follow-up'
  const herdText = isMultipleHerdsUserJourney(dateOfVisit, latestEndemicsApplication.flags) ? getHerdText(typeOfLivestock) : ''

  return `Did you have ${speciesEligibleNumberForDisplay}${herdText} on the date of the ${claimTypeText}?`
}

const getHandler = {
  method: 'GET',
  path: pageUrl,
  options: {
    handler: async (request, h) => {
      const claim = getEndemicsClaim(request)

      if (!claim) {
        throw new Error('No claim found in session')
      }

      const speciesEligibleNumberForDisplay = getSpeciesEligibleNumberForDisplay(claim, isEndemicsClaims)

      const questionText = legendText(speciesEligibleNumberForDisplay, claim.typeOfReview, claim?.typeOfLivestock, claim.dateOfVisit, claim.latestEndemicsApplication)

      return h.view(endemicsSpeciesNumbers, {
        backLink: backLink(request),
        customisedTitle: questionText,
        ...getYesNoRadios(
          questionText,
          speciesNumbers,
          getEndemicsClaim(request, speciesNumbers),
          undefined,
          radioOptions
        )
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
        [speciesNumbers]: Joi.string().valid('yes', 'no').required()
      }),
      failAction: (request, h, err) => {
        request.logger.setBindings({ err })
        const claim = getEndemicsClaim(request)

        if (!claim) {
          throw new Error('No claim found in session')
        }

        const speciesEligibleNumberForDisplay = getSpeciesEligibleNumberForDisplay(claim, isEndemicsClaims)

        return h.view(endemicsSpeciesNumbers, {
          backLink: backLink(request),
          errorMessage: { text: errorMessageText(claim.typeOfReview, speciesEligibleNumberForDisplay, claim.typeOfLivestock, claim.dateOfVisit, claim.latestEndemicsApplication) },
          ...getYesNoRadios(
            legendText(speciesEligibleNumberForDisplay, claim.typeOfReview, claim?.typeOfLivestock, claim.dateOfVisit, claim.latestEndemicsApplication),
            speciesNumbers,
            getEndemicsClaim(request, speciesNumbers),
            errorMessageText(claim?.typeOfReview, speciesEligibleNumberForDisplay, claim?.typeOfLivestock, claim.dateOfVisit, claim.latestEndemicsApplication),
            radioOptions
          )
        })
          .code(HttpStatus.BAD_REQUEST)
          .takeover()
      }
    },
    handler: async (request, h) => {
      const { typeOfLivestock, typeOfReview } = getEndemicsClaim(request)
      const { isBeef, isDairy } = getLivestockTypes(typeOfLivestock)
      const { isReview, isEndemicsFollowUp } = getReviewType(typeOfReview)

      const answer = request.payload[speciesNumbers]
      setEndemicsClaim(request, speciesNumbers, answer)

      if (answer === 'yes') {
        if (isDairy || (isBeef && isEndemicsFollowUp)) {
          return h.redirect(prefixUrl(endemicsVetName))
        }

        return h.redirect(prefixUrl(endemicsNumberOfSpeciesTested))
      }

      raiseInvalidDataEvent(request, speciesNumbers, `Value ${answer} is not equal to required value yes`)
      return h.view(endemicsSpeciesNumbersException, { backLink: pageUrl, changeYourAnswerText: sheepNumbersExceptionsText[typeOfReview], isReview })
        .code(HttpStatus.BAD_REQUEST)
        .takeover()
    }
  }
}

export const speciesNumbersHandlers = [getHandler, postHandler]

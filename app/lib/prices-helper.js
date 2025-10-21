import { claimType, TYPE_OF_LIVESTOCK, prices } from "ffc-ahwr-common-library";
import { isVisitDateAfterPIHuntAndDairyGoLive } from "./context-helper.js";
import { claimConstants } from "../constants/claim-constants.js"

const getPiHuntValue = (reviewTestResults, piHunt, piHuntAllAnimals, claimType, typeOfLivestock) => {
  const optionalPiHuntValue = (piHunt === 'yes' && piHuntAllAnimals === 'yes') ? 'yesPiHunt' : 'noPiHunt'

  if (reviewTestResults === claimConstants.result.positive) {
    return prices[claimType][typeOfLivestock].value[reviewTestResults]
  }

  return prices[claimType][typeOfLivestock].value[reviewTestResults][optionalPiHuntValue]
}

const getNonPiHuntValue = (reviewTestResults, claimType, typeOfLivestock) => {
  if (reviewTestResults === claimConstants.result.positive) {
    return prices[claimType][typeOfLivestock].value[reviewTestResults]
  }

  return prices[claimType][typeOfLivestock].value[reviewTestResults].noPiHunt
}

const getBeefDairyAmount = (data, claimType) => {
  const { typeOfLivestock, reviewTestResults, piHunt, piHuntAllAnimals, dateOfVisit } = data

  if (isVisitDateAfterPIHuntAndDairyGoLive(dateOfVisit)) {
    return getPiHuntValue(reviewTestResults, piHunt, piHuntAllAnimals, claimType, typeOfLivestock)
  }

  return getNonPiHuntValue(reviewTestResults, claimType, typeOfLivestock)
}

// TODO: we might want to just put this in common library as some shared logic wrapper around the raw prices config
export const getAmount = (data) => {
  const {
    type,
    typeOfLivestock,
    reviewTestResults
  } = data
  const typeOfClaim = type === claimType.review ? 'review' : 'followUp'


  if ([TYPE_OF_LIVESTOCK.BEEF, TYPE_OF_LIVESTOCK.DAIRY].includes(typeOfLivestock) && reviewTestResults && type === claimType.endemics) {
    return getBeefDairyAmount(data, typeOfClaim)
  }

  return prices[typeOfClaim][typeOfLivestock].value
}
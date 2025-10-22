import { BEEF, DAIRY, PIGS, SHEEP } from "../constants/claim-constants.js";
import { claimType } from "ffc-ahwr-common-library";

export const isWithin10MonthsFromNow = (d) => {
  const date = new Date(d);
  const datePlus10Months = date.setMonth(date.getMonth() + 10);
  return datePlus10Months >= Date.now();
};

export const areDatesWithin10Months = (a, b) => {
  const [dateA, dateB] = [new Date(a), new Date(b)];
  const [firstDate, secondDate] = dateA < dateB ? [dateA, dateB] : [dateB, dateA];
  const firstDatePlus10Months = firstDate.setMonth(firstDate.getMonth() + 10);
  return firstDatePlus10Months >= secondDate.valueOf();
};

export const getTestResult = (testResult) => {
  return {
    isPositive: testResult === "positive",
    isNegative: testResult === "negative",
  };
};

export const getLivestockTypes = (typeOfLivestock) => {
  return {
    isBeef: typeOfLivestock === BEEF,
    isDairy: typeOfLivestock === DAIRY,
    isPigs: typeOfLivestock === PIGS,
    isSheep: typeOfLivestock === SHEEP,
  };
};

export const isCows = (typeOfLivestock) => typeOfLivestock === BEEF || typeOfLivestock === DAIRY;

export function getClaimType(claimData, isEndemicsClaims = false) {
  if (!isEndemicsClaims) {
    const { whichReview } = claimData;
    if (whichReview) {
      return whichReview;
    }
    throw new Error("No claim type found, 'whichReview' property empty.");
  }
  const { typeOfLivestock } = claimData;
  if (typeOfLivestock && isEndemicsClaims) {
    return typeOfLivestock;
  }
  throw new Error("No claim type found, 'typeOfLivestock' property empty.");
}

export const getReviewType = (typeOfReview) => {
  return {
    isReview: typeOfReview === claimType.review,
    isEndemicsFollowUp: typeOfReview === claimType.endemics,
  };
};

export const getEndemicsClaimDetails = (typeOfLivestock, typeOfReview) => {
  const { isBeef, isDairy, isPigs, isSheep } = getLivestockTypes(typeOfLivestock)
  const { isEndemicsFollowUp, isReview } = getReviewType(typeOfReview)
  const isBeefOrDairyEndemics = (isBeef || isDairy) && isEndemicsFollowUp

  return { isBeef, isDairy, isPigs, isSheep, isEndemicsFollowUp, isBeefOrDairyEndemics, isReview }
}

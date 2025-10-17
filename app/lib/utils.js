import { claimConstants } from "../constants/claim-constants.js";

const { beef, dairy, pigs, sheep } = claimConstants.livestockTypes;

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
    isBeef: typeOfLivestock === beef,
    isDairy: typeOfLivestock === dairy,
    isPigs: typeOfLivestock === pigs,
    isSheep: typeOfLivestock === sheep,
  };
};

export const isCows = (typeOfLivestock) => typeOfLivestock === beef || typeOfLivestock === dairy;

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
    isReview: typeOfReview === claimConstants.claimType.review,
    isEndemicsFollowUp: typeOfReview === claimConstants.claimType.endemics,
  };
};

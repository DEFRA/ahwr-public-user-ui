import { BEEF, DAIRY, PIGS, SHEEP } from "../constants/claim-constants.js";
import { claimType } from "ffc-ahwr-common-library";

export const isWithin10MonthsFromNow = (d) => {
  const date = new Date(d);
  const datePlus10Months = date.setMonth(date.getMonth() + 10);
  return datePlus10Months >= Date.now();
};

// Strip time-of-day so a boundary date counts for the whole calendar day.
// Technically we set all the dates already to be at 00:00:00.000
// But this is additional peace of mind
const toDateOnly = (originalDate) => {
  const date = new Date(originalDate);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

/**
 * Adds whole calendar months to a date, clamping the day to the last valid day of the target
 * month (e.g. 31 Jan + 10 months = 30 Nov, not 1 Dec). Native `Date.setMonth` overflows into
 * the following month instead of clamping. The result is normalised to midnight (date-only).
 *
 * @param {Date|string|number} d - The starting date (anything `new Date()` accepts).
 * @param {number} months - The number of calendar months to add.
 * @returns {Date} A date-only `Date` `months` calendar months after `d`.
 */
export const addCalendarMonths = (d, months) => {
  const date = toDateOnly(d);
  const firstOfTargetMonth = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDayOfTargetMonth = new Date(
    firstOfTargetMonth.getFullYear(),
    firstOfTargetMonth.getMonth() + 1,
    0,
  ).getDate();
  return new Date(
    firstOfTargetMonth.getFullYear(),
    firstOfTargetMonth.getMonth(),
    Math.min(date.getDate(), lastDayOfTargetMonth),
  );
};

const orderedDates = (a, b) => (toDateOnly(a) <= toDateOnly(b) ? [a, b] : [b, a]);

/**
 * Determines whether two dates are no more than 10 calendar months apart, ignoring time-of-day.
 * The comparison is inclusive: dates exactly 10 calendar months apart are treated as within range.
 * Month arithmetic clamps to the end of the target month (see {@link addCalendarMonths}), and the
 * argument order does not matter.
 *
 * Used for the "maximum gap" rule (a follow-up must fall within 10 months of its review) and for
 * lookups such as finding a review within the last 10 months.
 *
 * @param {Date|string|number} a - One date.
 * @param {Date|string|number} b - The other date.
 * @returns {boolean} `true` if the two dates are 10 calendar months apart or less.
 */
export const areDatesWithin10Months = (a, b) => {
  const [earlier, later] = orderedDates(a, b);
  return toDateOnly(later) <= addCalendarMonths(earlier, 10);
};

/**
 * Determines whether two dates are strictly less than 10 calendar months apart, ignoring
 * time-of-day. The comparison excludes the boundary: dates exactly 10 calendar months apart are
 * NOT considered less than 10 months apart. Month arithmetic clamps to the end of the target month
 * (see {@link addCalendarMonths}), and the argument order does not matter.
 *
 * Used as the "too soon" guard for the minimum-gap rules: reviews must be at least 10 months apart,
 * and follow-ups must be at least 10 months apart, with the exact-10-month boundary allowed.
 *
 * @param {Date|string|number} a - One date.
 * @param {Date|string|number} b - The other date.
 * @returns {boolean} `true` if the two dates are less than 10 calendar months apart.
 */
export const isLessThan10MonthsApart = (a, b) => {
  const [earlier, later] = orderedDates(a, b);
  return toDateOnly(later) < addCalendarMonths(earlier, 10);
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
  const { isBeef, isDairy, isPigs, isSheep } = getLivestockTypes(typeOfLivestock);
  const { isEndemicsFollowUp, isReview } = getReviewType(typeOfReview);
  const isBeefOrDairyEndemics = (isBeef || isDairy) && isEndemicsFollowUp;

  return { isBeef, isDairy, isPigs, isSheep, isEndemicsFollowUp, isBeefOrDairyEndemics, isReview };
};

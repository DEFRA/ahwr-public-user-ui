import Joi from "joi";
import {
  MAX_POSSIBLE_DAY,
  MAX_POSSIBLE_DAY_FEB,
  MAX_POSSIBLE_DAY_FEB_LEAP_YEAR,
  MAX_POSSIBLE_DAY_SHORT_MONTHS,
  SHORT_MONTHS,
  MAX_POSSIBLE_MONTH,
  MAX_POSSIBLE_YEAR,
} from "../constants/claim-constants.js";

export const isValidDate = (year, month, day) => {
  const dateObject = new Date(year, month - 1, day);
  return (
    dateObject.getFullYear() === year &&
    dateObject.getMonth() === month - 1 &&
    dateObject.getDate() === day
  );
};

const isDayEmpty = (helpers, namePrefix) => helpers.state.ancestors[0][`${namePrefix}-day`] === "";
const isYearEmpty = (helpers, namePrefix) =>
  helpers.state.ancestors[0][`${namePrefix}-year`] === "";
const isMonthEmpty = (helpers, namePrefix) =>
  helpers.state.ancestors[0][`${namePrefix}-month`] === "";
const LEAP_YEAR_DIVISIBLE_FOUR_HUNDRED = 400;
const isLeapYear = (year) =>
  (year % 4 === 0 && year % 100 !== 0) || year % LEAP_YEAR_DIVISIBLE_FOUR_HUNDRED === 0;

export const validateDateInputDay = (namePrefix, dateName) => {
  return Joi.when(`${namePrefix}-day`, {
    switch: [
      {
        is: "",
        then: Joi.custom((_value, helpers) => {
          if (isYearEmpty(helpers, namePrefix) && isMonthEmpty(helpers, namePrefix)) {
            return helpers.error("dateInputDay.ifNothingIsEntered");
          }
          if (isYearEmpty(helpers, namePrefix)) {
            return helpers.error("dateInputDay.ifTheDateIsIncomplete.dayAndYear");
          }
          if (isMonthEmpty(helpers, namePrefix)) {
            return helpers.error("dateInputDay.ifTheDateIsIncomplete.dayAndMonth");
          }
          return helpers.error("dateInputDay.ifTheDateIsIncomplete.day");
        }),
        otherwise: Joi.number()
          .min(1)
          .when(`${namePrefix}-month`, {
            switch: [
              {
                is: Joi.number().valid(2),
                then: Joi.number().custom((value, helpers) => {
                  const year = helpers.state.ancestors[0][`${namePrefix}-year`];
                  const isValidDay = isLeapYear(year)
                    ? value <= MAX_POSSIBLE_DAY_FEB_LEAP_YEAR
                    : value <= MAX_POSSIBLE_DAY_FEB;
                  return isValidDay
                    ? value
                    : helpers.error("dateInputDay.ifTheDateEnteredCannotBeCorrect");
                }),
              },
              {
                is: Joi.number().valid(...SHORT_MONTHS),
                then: Joi.number().max(MAX_POSSIBLE_DAY_SHORT_MONTHS),
                otherwise: Joi.number().max(MAX_POSSIBLE_DAY),
              },
            ],
          })
          .required(),
      },
    ],
  }).messages({
    "number.base": `${dateName} must be a real date`,
    "number.min": `${dateName} must be a real date`,
    "number.max": `${dateName} must be a real date`,
    "dateInputDay.ifTheDateEnteredCannotBeCorrect": `${dateName} must be a real date`,
    "dateInputDay.ifTheDateIsIncomplete.dayAndYear": `${dateName} must include a day and a year`,
    "dateInputDay.ifTheDateIsIncomplete.dayAndMonth": `${dateName} must include a day and a month`,
    "dateInputDay.ifTheDateIsIncomplete.day": `${dateName} must include a day`,
  });
};

export const validateDateInputMonth = (namePrefix, dateName) => {
  return Joi.when(`${namePrefix}-month`, {
    switch: [
      {
        is: "",
        then: Joi.custom((_value, helpers) => {
          if (isDayEmpty(helpers, namePrefix) && isYearEmpty(helpers, namePrefix)) {
            return helpers.error("dateInputMonth.ifNothingIsEntered");
          }
          if (isDayEmpty(helpers, namePrefix)) {
            return helpers.error("dateInputMonth.ifTheDateIsIncomplete.dayAndMonth");
          }
          if (isYearEmpty(helpers, namePrefix)) {
            return helpers.error("dateInputMonth.ifTheDateIsIncomplete.monthAndYear");
          }
          return helpers.error("dateInputMonth.ifTheDateIsIncomplete.month");
        }),
        otherwise: Joi.number().min(1).max(MAX_POSSIBLE_MONTH).required(),
      },
    ],
  }).messages({
    "number.base": `${dateName} must be a real date`,
    "number.min": `${dateName} must be a real date`,
    "number.max": `${dateName} must be a real date`,
    "dateInputMonth.ifNothingIsEntered": `Enter ${dateName.toLowerCase()}`,
    "dateInputMonth.ifTheDateIsIncomplete.dayAndMonth": `${dateName} must include a day and a month`,
    "dateInputMonth.ifTheDateIsIncomplete.monthAndYear": `${dateName} must include a month and a year`,
    "dateInputMonth.ifTheDateIsIncomplete.month": `${dateName} must include a month`,
  });
};

export const validateDateInputYear = (namePrefix, dateName, customValidation, customMessages) => {
  return Joi.when(`${namePrefix}-year`, {
    switch: [
      {
        is: "",
        then: Joi.custom((_value, helpers) => {
          if (isDayEmpty(helpers, namePrefix) && isMonthEmpty(helpers, namePrefix)) {
            return helpers.error("dateInputYear.ifNothingIsEntered");
          }
          if (isDayEmpty(helpers, namePrefix)) {
            return helpers.error("dateInputYear.ifTheDateIsIncomplete.dayAndYear");
          }
          if (isMonthEmpty(helpers, namePrefix)) {
            return helpers.error("dateInputYear.ifTheDateIsIncomplete.monthAndYear");
          }
          return helpers.error("dateInputYear.ifTheDateIsIncomplete.year");
        }),
        otherwise: Joi.number()
          .min(1000)
          .max(MAX_POSSIBLE_YEAR)
          .required()
          .when(`${namePrefix}-day`, {
            is: Joi.number().required(),
            then: Joi.when(`${namePrefix}-month`, {
              is: Joi.number().required(),
              then: Joi.custom(customValidation),
            }),
          }),
      },
    ],
  }).messages({
    "number.min": "Year must include 4 numbers",
    "number.max": "Year must include 4 numbers",
    "dateInputYear.ifNothingIsEntered": `Enter ${dateName.toLowerCase()}`,
    "dateInputYear.ifTheDateIsIncomplete.dayAndYear": `${dateName} must include a day and a year`,
    "dateInputYear.ifTheDateIsIncomplete.monthAndYear": `${dateName} must include a month and a year`,
    "dateInputYear.ifTheDateIsIncomplete.year": `${dateName} must include a year`,
    ...customMessages,
  });
};

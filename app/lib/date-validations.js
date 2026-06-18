import { MAX_POSSIBLE_YEAR, MIN_POSSIBLE_YEAR } from "../constants/claim-constants.js";

export const isValidDate = (year, month, day) => {
  const dateObject = new Date(year, month - 1, day);
  return (
    dateObject.getFullYear() === year &&
    dateObject.getMonth() === month - 1 &&
    dateObject.getDate() === day
  );
};

const DATE_PARTS = ["day", "month", "year"];

const inputsInError = (flagged) =>
  Object.fromEntries(DATE_PARTS.map((part) => [part, flagged.includes(part)]));

// Validates the raw day/month/year strings of a GOV.UK date input as a single
// unit. Returns null when the date is complete and real, otherwise a descriptor
// the route maps to a message. Future/agreement-date rules live in the route.
export const validateDateParts = ({ day, month, year }) => {
  const missing = DATE_PARTS.filter((part) => ({ day, month, year })[part] === "");
  if (missing.length > 0) {
    return { reason: "incomplete", missing, inputsInError: inputsInError(missing) };
  }

  if (Number(year) < MIN_POSSIBLE_YEAR || Number(year) > MAX_POSSIBLE_YEAR) {
    return { reason: "year", missing: [], inputsInError: inputsInError(["year"]) };
  }

  if (!isValidDate(Number(year), Number(month), Number(day))) {
    return { reason: "realDate", missing: [], inputsInError: inputsInError(DATE_PARTS) };
  }

  return null;
};

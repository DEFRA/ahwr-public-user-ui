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
const DATE_PARTS_COUNT = DATE_PARTS.length;

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

/**
 * Turns a {@link validateDateParts} descriptor into a user-facing message. The
 * wording differs per screen, so the caller supplies the message text.
 *
 * @param {{ reason: string, missing: string[] }} partsError - Descriptor returned by {@link validateDateParts}.
 * @param {object} messages - Screen-specific wording.
 * @param {string} messages.enterDate - Shown when every date part is missing.
 * @param {string} messages.subject - Leading phrase for a partially-missing date, e.g. "Date of review".
 * @param {string} messages.realDate - Shown when the entered date is not a real date.
 * @returns {string} The message to display.
 */
export const datePartsMessage = ({ reason, missing }, { enterDate, subject, realDate }) => {
  if (reason === "incomplete") {
    return missing.length === DATE_PARTS_COUNT
      ? enterDate
      : `${subject} must include a ${missing.join(" and a ")}`;
  }
  if (reason === "year") {
    return "Year must include 4 numbers";
  }
  return realDate;
};

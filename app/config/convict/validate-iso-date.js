import { isValidDate } from "../../lib/date-validations.js";

const YYYY_MM_DD = /^(\d{4})-(\d{2})-(\d{2})$/;

// Accepts an unset value (null or "", e.g. an empty env var) or a real calendar day as YYYY-MM-DD.
// The real-day check reuses the date-of-visit validation.
export const convictValidateIsoDate = {
  name: "iso-date",
  validate: function validateIsoDate(value) {
    if (!value) {
      return;
    }

    const [, year, month, day] = YYYY_MM_DD.exec(value) ?? [];
    if (!year || !isValidDate(Number(year), Number(month), Number(day))) {
      throw new Error("must be a valid date in the format YYYY-MM-DD");
    }
  },
};

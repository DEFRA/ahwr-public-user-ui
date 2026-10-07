import joi from "joi";
import { toDateOnly } from "../../lib/utils.js";

const isoDate = joi.date().iso();

// An unset value (null or "", e.g. an empty env var) or an ISO 8601 date, read once into the local
// calendar day, the same way vet visit dates are stored. Invalid values are left as they are for
// validate to report.
export const convictValidateIsoDate = {
  name: "iso-date",
  validate: function validateIsoDate(value) {
    joi.assert(value, isoDate);
  },
  coerce: function coerceIsoDate(value) {
    if (!value) {
      return null;
    }
    const { value: date, error } = isoDate.validate(value);
    return error ? value : toDateOnly(date);
  },
};

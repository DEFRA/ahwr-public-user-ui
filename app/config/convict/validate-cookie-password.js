import joi from "joi";

export const convictValidateCookiePassword = {
  name: "cookie-password",
  validate: function validateCookiePassword(value) {
    joi.assert(value, joi.string().min(32).required());
  },
};

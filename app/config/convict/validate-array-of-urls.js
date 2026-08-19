import joi from "joi";

export const convictValidateArrayOfUrls = {
  name: "array-of-urls",
  validate: function validateArrayOfUrls(value) {
    joi.assert(value, joi.array().items(joi.string().uri()));
  },
};

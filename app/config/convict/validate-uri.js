import joi from "joi";

// Mirrors the lenient joi.string().uri() semantics the config relied on before
// convict (no TLD required), unlike convict-format-with-validator's stricter url.
export const convictValidateUri = {
  name: "uri",
  validate: function validateUri(value) {
    joi.assert(value, joi.string().uri());
  },
};

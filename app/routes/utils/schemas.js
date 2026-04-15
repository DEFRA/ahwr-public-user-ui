import Joi from "joi";

const errorMessages = {
  enterName: "Enter the vet's name",
  nameLength: "Vet's name must be 50 characters or fewer",
  namePattern:
    "Vet's name must only include letters a to z, numbers and special characters such as hyphens, spaces, apostrophes, ampersands, commas, brackets or a forward slash",
};

const MAX_VET_NAME_LENGTH = 50;
const VET_NAME_PATTERN = /^[A-Za-z0-9&,' \-/()]+$/;

export const vetsNameSchema = Joi.string()
  .trim()
  .max(MAX_VET_NAME_LENGTH)
  .pattern(VET_NAME_PATTERN)
  .required()
  .messages({
    "any.required": errorMessages.enterName,
    "string.base": errorMessages.enterName,
    "string.empty": errorMessages.enterName,
    "string.max": errorMessages.nameLength,
    "string.pattern.base": errorMessages.namePattern,
  });

import Joi from "joi";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
  emitHerdEvent,
} from "../../session/index.js";
import HttpStatus from "http-status-codes";
import { getHerdOrFlock } from "../../lib/display-helpers.js";
import { claimRoutes, claimViews } from "../../constants/routes.js";

const getBackLink = (herds) =>
  !herds?.length ? claimRoutes.dateOfVisit : claimRoutes.selectTheHerd;

const getHandler = {
  method: "GET",
  path: "/enter-herd-name",
  options: {
    tags: ["mh"],
    handler: async (request, h) => {
      const { herdName, herds, typeOfLivestock } = getSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
      );
      return h.view(claimViews.enterHerdName, {
        backLink: getBackLink(herds),
        herdName,
        herdOrFlock: getHerdOrFlock(typeOfLivestock),
      });
    },
  },
};

const minHerdNameLength = 2;
const maxHerdNameLength = 30;

const ERROR_MESSAGES = {
  NAME_LENGTH: `Name must be between ${minHerdNameLength} and ${maxHerdNameLength} characters`,
  NAME_PATTERN:
    "Name must only include letters a to z, numbers and special characters such as hyphens, spaces and apostrophes.",
  NAME_UNIQUE: "You have already used this name, the name must be unique",
};

const isHerdNameEmpty = (errorType) =>
  errorType === "any.required" || errorType === "string.base" || errorType === "string.empty";

const postHandler = {
  method: "POST",
  path: "/enter-herd-name",
  options: {
    validate: {
      payload: Joi.object({
        herdName: Joi.string()
          .trim()
          .min(minHerdNameLength)
          .max(maxHerdNameLength)
          .pattern(/^[A-Za-z0-9&,' \-/()]+$/)
          .messages({
            "string.min": ERROR_MESSAGES.NAME_LENGTH,
            "string.max": ERROR_MESSAGES.NAME_LENGTH,
            "string.pattern.base": ERROR_MESSAGES.NAME_PATTERN,
          })
          .required(),
      }),
      failAction: async (request, h, error) => {
        request.logger.error({ error });
        const { herds, typeOfLivestock } = getSessionData(request, sessionEntryKeys.endemicsClaim);
        const herdOrFlock = getHerdOrFlock(typeOfLivestock);
        const errorType = error.details[0].type;

        const errorText = isHerdNameEmpty(errorType)
          ? `Enter the ${herdOrFlock} name`
          : error.details[0].message;

        return h
          .view(claimViews.enterHerdName, {
            ...request.payload,
            errorMessage: {
              text: errorText,
              href: "#herdName",
            },
            backLink: getBackLink(herds),
            herdOrFlock: getHerdOrFlock(typeOfLivestock),
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      },
    },
    handler: async (request, h) => {
      const { herdName } = request.payload;
      const { herdId, herdVersion, previousClaims, herds, typeOfLivestock } = getSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
      );

      if (previousClaims?.some((claim) => claim.herd?.name === herdName.trim())) {
        return h
          .view(claimViews.enterHerdName, {
            ...request.payload,
            errorMessage: {
              text: ERROR_MESSAGES.NAME_UNIQUE,
              href: "#herdName",
            },
            backLink: getBackLink(herds),
            herdOrFlock: getHerdOrFlock(typeOfLivestock),
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      }

      await setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.herdName,
        herdName.trim(),
      );

      await emitHerdEvent({
        request,
        type: "herd-name",
        message: "Herd name collected from user",
        data: {
          herdId,
          herdVersion,
          herdName,
        },
      });

      return h.redirect(claimRoutes.enterCphNumber);
    },
  },
};

export const enterHerdNameHandlers = [getHandler, postHandler];

import { poultryClaimRoutes, poultryClaimViews } from "../../../constants/routes.js";
import Joi from "joi";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
  emitHerdEvent,
} from "../../../session/index.js";
import HttpStatus from "http-status-codes";

const getBackLink = (herds) =>
  !herds?.length ? poultryClaimRoutes.dateOfReview : poultryClaimRoutes.selectTheSite;

const getHandler = {
  method: "GET",
  path: poultryClaimRoutes.enterSiteName,
  options: {
    handler: async (request, h) => {
      const { herdName, herds } = getSessionData(request, sessionEntryKeys.poultryClaim);
      return h.view(poultryClaimViews.enterSiteName, {
        backLink: getBackLink(herds),
        herdName,
      });
    },
  },
};

const MIN_SITE_NAME_LENGTH = 2;
const MAX_SITE_NAME_LENGTH = 30;

const ERROR_MESSAGES = {
  NAME_LENGTH: `Name must be between ${MIN_SITE_NAME_LENGTH} and ${MAX_SITE_NAME_LENGTH} characters`,
  NAME_PATTERN:
    "Name must only include letters a to z, numbers and special characters such as hyphens, spaces and apostrophes.",
  NAME_UNIQUE: "You have already used this name, the name must be unique",
};

const isSiteNameEmpty = (errorType) =>
  errorType === "any.required" || errorType === "string.base" || errorType === "string.empty";

const postHandler = {
  method: "POST",
  path: poultryClaimRoutes.enterSiteName,
  options: {
    validate: {
      payload: Joi.object({
        herdName: Joi.string()
          .trim()
          .min(MIN_SITE_NAME_LENGTH)
          .max(MAX_SITE_NAME_LENGTH)
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
        const { herds } = getSessionData(request, sessionEntryKeys.poultryClaim);

        const errorType = error.details[0].type;
        const errorText = isSiteNameEmpty(errorType)
          ? `Enter the site name`
          : error.details[0].message;

        return h
          .view(poultryClaimViews.enterSiteName, {
            ...request.payload,
            errorMessage: {
              text: errorText,
              href: "#herdName",
            },
            backLink: getBackLink(herds),
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      },
    },
    handler: async (request, h) => {
      const { herdName } = request.payload;
      const { herdId, herdVersion, previousClaims, herds } = getSessionData(
        request,
        sessionEntryKeys.poultryClaim,
      );

      if (previousClaims?.some((claim) => claim.herd?.name === herdName.trim())) {
        return h
          .view(poultryClaimViews.enterSiteName, {
            ...request.payload,
            errorMessage: {
              text: ERROR_MESSAGES.NAME_UNIQUE,
              href: "#herdName",
            },
            backLink: getBackLink(herds),
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      }

      await setSessionData(
        request,
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.siteName,
        herdName.trim(),
        { shouldEmitEvent: false },
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

      return h.redirect(poultryClaimRoutes.enterCphNumber);
    },
  },
};

export const poultryEnterSiteNameHandlers = [getHandler, postHandler];

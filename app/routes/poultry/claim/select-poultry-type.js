import { poultryClaimRoutes, poultryClaimViews } from "../../../constants/routes.js";
import Joi from "joi";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../../session/index.js";
import HttpStatus from "http-status-codes";
import { TYPE_OF_POULTRY } from "ffc-ahwr-common-library";

const chickenSubtypes = new Set([
  TYPE_OF_POULTRY.BROILERS,
  TYPE_OF_POULTRY.LAYING,
  TYPE_OF_POULTRY.BREEDERS,
]);

const getBackLink = (herds) =>
  herds?.length ? poultryClaimRoutes.selectTheSite : poultryClaimRoutes.siteOthersOnSbi;

const getHandler = {
  method: "GET",
  path: poultryClaimRoutes.selectPoultryType,
  options: {
    handler: async (request, h) => {
      const { typesOfPoultry: storedTypes, herds } =
        getSessionData(request, sessionEntryKeys.poultryClaim) ?? {};
      const typesOfPoultry = (storedTypes ?? []).filter((t) => !chickenSubtypes.has(t));
      const typesOfChicken = (storedTypes ?? []).filter((t) => chickenSubtypes.has(t));
      return h.view(poultryClaimViews.selectPoultryType, {
        backLink: getBackLink(herds),
        typesOfPoultry,
        typesOfChicken,
      });
    },
  },
};

const errorMessage = { text: "Select at least one option", href: "#typesOfPoultry" };

const postHandler = {
  method: "POST",
  path: poultryClaimRoutes.selectPoultryType,
  options: {
    validate: {
      payload: Joi.object({
        typesOfPoultry: Joi.array().items(Joi.string()).min(1).single().required(),
        typesOfChicken: Joi.array().items(Joi.string()).min(1).single().optional().default([]),
      }),
      failAction: async (request, h, error) => {
        request.logger.error({ error });
        const { herds } = getSessionData(request, sessionEntryKeys.poultryClaim) ?? {};
        return h
          .view(poultryClaimViews.selectPoultryType, {
            backLink: getBackLink(herds),
            errorMessageMain: errorMessage,
            errorMessage,
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      },
    },
    handler: async (request, h) => {
      const { typesOfPoultry, typesOfChicken } = request.payload;
      const { herds } = getSessionData(request, sessionEntryKeys.poultryClaim) ?? {};
      const hasChicken = typesOfPoultry.includes("chickens");

      if (hasChicken && typesOfChicken.length === 0) {
        return h
          .view(poultryClaimViews.selectPoultryType, {
            backLink: getBackLink(herds),
            errorMessageMain: errorMessage,
            errorMessageChicken: errorMessage,
            typesOfPoultry,
          })
          .code(HttpStatus.BAD_REQUEST);
      }

      const combinedTypes = [...typesOfPoultry, ...typesOfChicken];
      await setSessionData(
        request,
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.typesOfPoultry,
        combinedTypes,
      );
      return h.redirect(poultryClaimRoutes.minimumNumberOfBirds);
    },
  },
};

export const poultrySelectPoultryTypeHandlers = [getHandler, postHandler];

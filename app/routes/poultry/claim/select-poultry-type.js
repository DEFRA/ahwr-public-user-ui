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

const getHandler = {
  method: "GET",
  path: poultryClaimRoutes.selectPoultryType,
  options: {
    handler: async (request, h) => {
      const storedTypes =
        getSessionData(request, sessionEntryKeys.poultryClaim)?.typesOfPoultry ?? [];
      const typesOfPoultry = storedTypes.filter((t) => !chickenSubtypes.has(t));
      const typesOfChicken = storedTypes.filter((t) => chickenSubtypes.has(t));
      return h.view(poultryClaimViews.selectPoultryType, {
        backLink: poultryClaimRoutes.siteOthersOnSbi,
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
        typesOfPoultry: Joi.alternatives()
          .try(Joi.string(), Joi.array().items(Joi.string()).min(1))
          .required(),
        typesOfChicken: Joi.alternatives()
          .try(Joi.string(), Joi.array().items(Joi.string()).min(1))
          .optional()
          .default([]),
      }),
      failAction: async (request, h, error) => {
        request.logger.error({ error });
        return h
          .view(poultryClaimViews.selectPoultryType, {
            backLink: poultryClaimRoutes.siteOthersOnSbi,
            errorMessageMain: errorMessage,
            errorMessage,
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      },
    },
    handler: async (request, h) => {
      const { typesOfPoultry, typesOfChicken } = request.payload;
      const poultryArray = Array.isArray(typesOfPoultry) ? typesOfPoultry : [typesOfPoultry];
      const chickenArray = Array.isArray(typesOfChicken) ? typesOfChicken : [typesOfChicken];
      const hasChicken = poultryArray.includes("chickens");

      if (hasChicken && chickenArray.length === 0) {
        return h
          .view(poultryClaimViews.selectPoultryType, {
            backLink: poultryClaimRoutes.siteOthersOnSbi,
            errorMessageMain: errorMessage,
            errorMessageChicken: errorMessage,
            typesOfPoultry: poultryArray,
          })
          .code(HttpStatus.BAD_REQUEST);
      }

      const combinedTypes = [...poultryArray, ...chickenArray];
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

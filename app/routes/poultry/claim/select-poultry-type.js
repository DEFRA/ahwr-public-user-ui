import { poultryClaimRoutes, poultryClaimViews } from "../../../constants/routes.js";
import Joi from "joi";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../../session/index.js";
import HttpStatus from "http-status-codes";

const getHandler = {
  method: "GET",
  path: poultryClaimRoutes.selectPoultryType,
  options: {
    handler: async (request, h) => {
      const typesOfPoultry =
        getSessionData(request, sessionEntryKeys.poultryClaim)?.typesOfPoultry ?? [];
      return h.view(poultryClaimViews.selectPoultryType, {
        backLink: poultryClaimRoutes.siteOthersOnSbi,
        typesOfPoultry,
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
      const { typesOfPoultry } = request.payload;
      const typesArray = Array.isArray(typesOfPoultry) ? typesOfPoultry : [typesOfPoultry];
      const hasChicken = typesArray.includes("chickens");
      const noSubtypes =
        typesArray.filter(
          (entry) => entry === "broilers" || entry === "laying-hens" || entry === "breeders",
        ).length === 0;

      if (hasChicken && noSubtypes) {
        return h
          .view(poultryClaimViews.selectPoultryType, {
            backLink: poultryClaimRoutes.siteOthersOnSbi,
            errorMessageMain: errorMessage,
            errorMessageChicken: errorMessage,
            typesOfPoultry: typesArray,
          })
          .code(HttpStatus.BAD_REQUEST);
      }

      setSessionData(
        request,
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.typesOfPoultry,
        typesArray,
      );
      return h.redirect(poultryClaimRoutes.minimumNumberOfBirds);
    },
  },
};

export const poultrySelectPoultryTypeHandlers = [getHandler, postHandler];

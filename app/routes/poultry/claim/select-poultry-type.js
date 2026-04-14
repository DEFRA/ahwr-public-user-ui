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
      const { typesOfPoultry } = getSessionData(request, sessionEntryKeys.poultryClaim);
      return h.view(poultryClaimViews.selectPoultryType, {
        backLink: "",
        typesOfPoultry,
      });
    },
  },
};

const errorMessage = { text: "Select at least one option", href: "#typesOfPoultry" };
const chickenSubTypeError = {
  text: "Select which type of chickens you keep",
  href: "#typesOfPoultry-2",
};

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
            backLink: "",
            errorMessage,
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      },
    },
    handler: async (request, h) => {
      const { typesOfPoultry } = request.payload;
      const typesArray = Array.isArray(typesOfPoultry) ? typesOfPoultry : [typesOfPoultry];
      // Filter out "chickens" as we only want the sub-types (broilers, laying-hens, breeders)
      const filteredTypes = typesArray.filter((type) => type !== "chickens");

      // If only "chickens" was selected without any sub-types, show error
      if (filteredTypes.length === 0) {
        return h
          .view(poultryClaimViews.selectPoultryType, {
            backLink: "",
            errorMessage: chickenSubTypeError,
            typesOfPoultry: typesArray,
          })
          .code(HttpStatus.BAD_REQUEST);
      }

      setSessionData(
        request,
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.typesOfPoultry,
        filteredTypes.join(", "),
      );
      return h.redirect(poultryClaimRoutes.minimumNumberOfAnimals);
    },
  },
};

export const poultrySelectPoultryTypeHandlers = [getHandler, postHandler];

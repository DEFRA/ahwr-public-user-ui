import HttpStatus from "http-status-codes";
import Joi from "joi";
import { livestockClaimRoutes, livestockClaimViews } from "../../../constants/routes.js";
import {
  getSessionData,
  sessionEntryKeys,
  sessionKeys,
  setSessionData,
} from "../../../session/index.js";

const YES_TO_ASSURANCE_TEXT = "Select yes if this is the only flock associated with this SBI";

const getHandler = {
  method: "GET",
  path: livestockClaimRoutes.assuranceScheme,
  options: {
    handler: async (request, h) => {
      const { assuranceScheme } = getSessionData(request, sessionEntryKeys.endemicsClaim);

      return h.view(livestockClaimViews.assuranceScheme, {
        ...(assuranceScheme && {
          previousAnswer: assuranceScheme,
        }),
        backLink: livestockClaimRoutes.checkHerdDetails,
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: livestockClaimRoutes.assuranceScheme,
  options: {
    validate: {
      payload: Joi.object({
        assurance: Joi.string()
          .valid("yes", "no")
          .required()
          .messages({ "any.required": YES_TO_ASSURANCE_TEXT }),
      }),
      failAction: async (request, h, error) => {
        request.logger.error({ error });
        return h
          .view(livestockClaimViews.assuranceScheme, {
            ...request.payload,
            backLink: livestockClaimRoutes.checkHerdDetails,
            errorMessage: {
              text: error.details[0].message,
              href: `#${sessionKeys.endemicsClaim.assuranceScheme}`,
            },
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      },
    },
    handler: async (request, h) => {
      const { assurance } = request.payload;

      await setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.assuranceScheme,
        assurance,
      );
      return h.redirect(livestockClaimRoutes.speciesNumbers);
    },
  },
};
export const assuranceSchemeHandlers = [getHandler, postHandler];

import Joi from "joi";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../../session/index.js";
import HttpStatus from "http-status-codes";
import { poultryClaimRoutes, poultryClaimViews } from "../../../constants/routes.js";

const getHandler = {
  method: "GET",
  path: poultryClaimRoutes.siteOthersOnSbi,
  options: {
    handler: async (request, h) => {
      const { isOnlyHerdOnSbi } = getSessionData(request, sessionEntryKeys.poultryClaim);
      return h.view(poultryClaimViews.siteOthersOnSbi, {
        backLink: poultryClaimRoutes.enterCphNumber,
        isOnlyHerdOnSbi,
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: poultryClaimRoutes.siteOthersOnSbi,
  options: {
    validate: {
      payload: Joi.object({
        isOnlyHerdOnSbi: Joi.string().required(),
      }),
      failAction: async (request, h, error) => {
        request.logger.error({ error });

        return h
          .view(poultryClaimViews.siteOthersOnSbi, {
            ...request.payload,
            errorMessage: {
              text: `Select yes if this is the only site associated with this SBI`,
              href: "#isOnlyHerdOnSbi",
            },
            backLink: poultryClaimRoutes.enterCphNumber,
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      },
    },
    handler: async (request, h) => {
      const { isOnlyHerdOnSbi } = request.payload;

      await setSessionData(
        request,
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.isOnlyHerdOnSbi,
        isOnlyHerdOnSbi,
        { shouldEmitEvent: false },
      );

      return h.redirect(poultryClaimRoutes.selectPoultryType);
    },
  },
};

export const poultrySiteOthersOnSbiHandlers = [getHandler, postHandler];

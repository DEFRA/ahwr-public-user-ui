import Joi from "joi";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
  emitHerdEvent,
} from "../../../session/index.js";
import HttpStatus from "http-status-codes";
import { poultryClaimRoutes, poultryClaimViews } from "../../../constants/routes.js";

const getHandler = {
  method: "GET",
  path: poultryClaimRoutes.sbiSites,
  options: {
    handler: async (request, h) => {
      const { isOnlyHerdOnSbi } = getSessionData(request, sessionEntryKeys.poultryClaim);
      return h.view(poultryClaimViews.sbiSites, {
        backLink: poultryClaimRoutes.enterCphNumber,
        isOnlyHerdOnSbi,
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: poultryClaimRoutes.sbiSites,
  options: {
    validate: {
      payload: Joi.object({
        isOnlyHerdOnSbi: Joi.string().required(),
      }),
      failAction: async (request, h, error) => {
        request.logger.error({ error });

        return h
          .view(poultryClaimViews.sbiSites, {
            ...request.payload,
            errorMessage: {
              text: `Select if this is the only site associated with this SBI`,
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

      const { herdId } = getSessionData(request, sessionEntryKeys.poultryClaim);

      await emitHerdEvent({
        request,
        type: "herd-reasons",
        message: "Only herd for user",
        data: {
          herdId,
          herdVersion: 1,
          herdReasonManagementNeeds: false,
          herdReasonUniqueHealth: false,
          herdReasonDifferentBreed: false,
          herdReasonOtherPurpose: false,
          herdReasonKeptSeparate: false,
          herdReasonOnlyHerd: isOnlyHerdOnSbi === "yes",
          herdReasonOther: false,
        },
      });

      return h.redirect(poultryClaimRoutes.poultryType);
    },
  },
};

export const poultrySiteOthersOnSbiHandlers = [getHandler, postHandler];

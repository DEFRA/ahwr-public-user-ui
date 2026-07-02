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
import { POULTRY_SCHEME } from "ffc-ahwr-common-library";
import { normalizeCphNumber } from "../../../lib/cph-normalization.js";
import { getClaimsCount } from "../../../api-requests/claim-api.js";

const getBackLink = (herdVersion) =>
  !herdVersion || herdVersion === 1
    ? poultryClaimRoutes.enterSiteName
    : poultryClaimRoutes.selectTheSite;

const getHandler = {
  method: "GET",
  path: "/poultry/cph",
  options: {
    handler: async (request, h) => {
      const { herdCph, herdVersion } = getSessionData(request, sessionEntryKeys.poultryClaim);

      return h.view(poultryClaimViews.enterCphNumber, {
        backLink: getBackLink(herdVersion),
        herdCph,
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: "/poultry/cph",
  options: {
    validate: {
      payload: Joi.object({
        herdCph: Joi.string()
          .custom((value, _) => normalizeCphNumber(value))
          .pattern(/^\d{2}\/\d{3}\/\d{4}$/)
          .required(),
      }),
      failAction: async (request, h, error) => {
        request.logger.error({ error });
        const { herdVersion } = getSessionData(request, sessionEntryKeys.poultryClaim);

        return h
          .view(poultryClaimViews.enterCphNumber, {
            ...request.payload,
            errorMessage: {
              text: "Enter the CPH for this site in the format 12/345/6789",
              href: "#herdCph",
            },
            backLink: getBackLink(herdVersion),
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      },
    },
    handler: async (request, h) => {
      const { herdCph } = request.payload;
      const { herds, herdId } = getSessionData(request, sessionEntryKeys.poultryClaim);

      const response = await getClaimsCount(herdCph, herdId, POULTRY_SCHEME, request.logger);

      if (response.count > 0) {
        return h
          .view(poultryClaimViews.enterCphNumber, {
            ...request.payload,
            errorMessage: {
              text: "Enter a CPH that you have not used for a different site",
              href: "#herdCph",
            },
            backLink: getBackLink(herds),
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      }

      await setSessionData(
        request,
        sessionEntryKeys.poultryClaim,
        sessionKeys.poultryClaim.herdCph,
        herdCph,
        { shouldEmitEvent: false },
      );

      await emitHerdEvent({
        request,
        type: "herd-cph",
        message: "Herd CPH collected from user",
        data: { herdId, herdVersion: 1, herdCph },
      });

      return h.redirect(poultryClaimRoutes.sbiSites);
    },
  },
};

export const poultryEnterCphNumberHandlers = [getHandler, postHandler];

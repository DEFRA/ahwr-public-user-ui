import Joi from "joi";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
  emitHerdEvent,
} from "../../../session/index.js";
import HttpStatus from "http-status-codes";
import { ONLY_HERD_ON_SBI } from "../../../constants/claim-constants.js";
import { skipOtherHerdsOnSbiPage } from "../../../lib/context-helper.js";
import { poultryClaimRoutes, poultryClaimViews } from "../../../constants/routes.js";
import { normalizeCphNumber } from "../../../lib/cph-normalization.js";
import { isCPHUnique } from "../../../api-requests/claim-api.js";

const getBackLink = (herdVersion) =>
  !herdVersion || herdVersion === 1
    ? poultryClaimRoutes.enterSiteName
    : poultryClaimRoutes.selectTheSite;

const getHandler = {
  method: "GET",
  path: "/poultry/enter-cph-number",
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
  path: "/poultry/enter-cph-number",
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
              text: "Enter the CPH for this site, format should be nn/nnn/nnnn",
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
      const { herds, isOnlyHerdOnSbi, herdId, herdVersion } = getSessionData(
        request,
        sessionEntryKeys.poultryClaim,
      );

      const response = await isCPHUnique(herdCph, herdId, request.logger);

      if (!response.isCPHUnique) {
        return h
          .view(poultryClaimViews.enterCphNumber, {
            ...request.payload,
            errorMessage: {
              text: "You have already used this CPH, the CPH must be unique",
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
        data: { herdId, herdVersion, herdCph },
      });

      let nextPageUrl;

      if (skipOtherHerdsOnSbiPage(herds, herdId)) {
        nextPageUrl =
          isOnlyHerdOnSbi === ONLY_HERD_ON_SBI.NO
            ? poultryClaimRoutes.enterSiteDetails
            : poultryClaimRoutes.checkSiteDetails;
      } else {
        nextPageUrl = poultryClaimRoutes.siteOthersOnSbi;
      }

      return h.redirect(nextPageUrl);
    },
  },
};

export const poultryEnterCphNumberHandlers = [getHandler, postHandler];

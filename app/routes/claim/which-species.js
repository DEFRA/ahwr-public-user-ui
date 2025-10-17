import Joi from "joi";
import { sessionKeys } from "../../session/keys.js";
import { getEndemicsClaim, setEndemicsClaim } from "../../session/index.js";
import links from "../../config/routes.js";
import { claimConstants } from "../../constants/claim-constants.js";
import { refreshApplications, resetEndemicsClaimSession } from "../../lib/context-helper.js";
import HttpStatus from "http-status-codes";
import { prefixUrl } from "../utils/page-utils.js";

const { livestockTypes } = claimConstants;
const { claimDashboard, endemicsWhichSpecies, endemicsWhichTypeOfReview } = links;

const pageUrl = prefixUrl(endemicsWhichSpecies);
const backLink = claimDashboard;
const errorMessage = { text: "Select which species you are claiming for" };

const getHandler = {
  method: "GET",
  path: pageUrl,
  options: {
    handler: async (request, h) => {
      // get type of livestock here, before we reset the session
      const {
        organisation: { sbi },
        typeOfLivestock,
      } = getEndemicsClaim(request);

      request.logger.setBindings({ sbi });

      // fetch latest new world (always) and latest old world (if relevant) application
      const { latestEndemicsApplication } = await refreshApplications(sbi, request);

      // reset the session as this is the entry point - if user goes all the way back
      // to this point to change species, we cant keep all their answers
      await resetEndemicsClaimSession(request, latestEndemicsApplication.reference);

      if (latestEndemicsApplication?.applicationRedacts?.length) {
        return h.redirect(links.claimDashboard).takeover();
      }

      return h.view(endemicsWhichSpecies, {
        ...(typeOfLivestock && {
          previousAnswer: typeOfLivestock,
        }),
        backLink,
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: pageUrl,
  options: {
    validate: {
      payload: Joi.object({
        typeOfLivestock: Joi.string()
          .valid(...Object.values(livestockTypes))
          .required(),
      }),
      failAction: (request, h, err) => {
        request.logger.setBindings({ err });
        return h
          .view(endemicsWhichSpecies, {
            errorMessage,
            backLink,
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      },
    },
    handler: async (request, h) => {
      const { typeOfLivestock } = request.payload;
      const {
        typeOfLivestock: prevTypeOfLivestock,
        reference,
        latestEndemicsApplication,
      } = getEndemicsClaim(request);

      if (typeOfLivestock !== prevTypeOfLivestock) {
        await resetEndemicsClaimSession(request, latestEndemicsApplication.reference, reference);
      }

      setEndemicsClaim(request, sessionKeys.endemicsClaim.typeOfLivestock, typeOfLivestock);

      return h.redirect(prefixUrl(endemicsWhichTypeOfReview));
    },
  },
};

export const whichSpeciesHandlers = [getHandler, postHandler];

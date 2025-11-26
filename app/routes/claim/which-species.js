import Joi from "joi";
import { refreshApplications, resetEndemicsClaimSession } from "../../lib/context-helper.js";
import HttpStatus from "http-status-codes";
import {
  getSessionData,
  sessionEntryKeys,
  sessionKeys,
  setSessionData,
} from "../../session/index.js";
import { claimRoutes, claimViews, dashboardRoutes } from "../../constants/routes.js";
import { TYPE_OF_LIVESTOCK } from "ffc-ahwr-common-library";

const errorMessage = { text: "Select which species you are claiming for" };

const getHandler = {
  method: "GET",
  path: claimRoutes.whichSpecies,
  options: {
    handler: async (request, h) => {
      // get type of livestock here, before we reset the session
      const { typeOfLivestock } = getSessionData(request, sessionEntryKeys.endemicsClaim);
      const organisation = getSessionData(request, sessionEntryKeys.organisation);

      request.logger.setBindings({ sbi: organisation.sbi });

      // fetch latest new world (always) and latest old world (if relevant) application
      const { latestEndemicsApplication } = await refreshApplications(organisation.sbi, request);

      // reset the session as this is the entry point - if user goes all the way back
      // to this point to change species, we cant keep all their answers
      await resetEndemicsClaimSession(request, latestEndemicsApplication.reference);

      return h.view(claimViews.whichSpecies, {
        ...(typeOfLivestock && {
          previousAnswer: typeOfLivestock,
        }),
        backLink: dashboardRoutes.manageYourClaims,
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: claimRoutes.whichSpecies,
  options: {
    validate: {
      payload: Joi.object({
        typeOfLivestock: Joi.string()
          .valid(...Object.values(TYPE_OF_LIVESTOCK))
          .required(),
      }),
      failAction: (request, h, err) => {
        request.logger.setBindings({ error: err });
        return h
          .view(claimViews.whichSpecies, {
            errorMessage,
            backLink: dashboardRoutes.manageYourClaims,
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
      } = getSessionData(request, sessionEntryKeys.endemicsClaim);

      if (typeOfLivestock !== prevTypeOfLivestock) {
        await resetEndemicsClaimSession(request, latestEndemicsApplication.reference, reference);
      }

      await setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.typeOfLivestock,
        typeOfLivestock,
      );

      return h.redirect(claimRoutes.whichTypeOfReview);
    },
  },
};

export const whichSpeciesHandlers = [getHandler, postHandler];

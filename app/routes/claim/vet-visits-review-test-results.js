import Joi from "joi";
import { radios } from "../models/form-component/radios.js";
import HttpStatus from "http-status-codes";
import { getLivestockTypes } from "../../lib/utils.js";
import { claimRoutes, claimViews } from "../../constants/routes.js";
import {
  getSessionData,
  sessionEntryKeys,
  sessionKeys,
  setSessionData,
} from "../../session/index.js";

const previousPageUrl = (typeOfLivestock) => {
  const { isBeef, isDairy } = getLivestockTypes(typeOfLivestock);
  if (isBeef || isDairy) {
    return claimRoutes.whichTypeOfReview;
  }
  return claimRoutes.vetRcvs;
};

const nextPageURL = (request) => {
  const { typeOfLivestock } = getSessionData(request, sessionEntryKeys.endemicsClaim);
  const { isBeef, isDairy } = getLivestockTypes(typeOfLivestock);

  if (isBeef || isDairy) {
    return claimRoutes.dateOfVisit;
  }
  return claimRoutes.vaccination;
};

const getHandler = {
  method: "GET",
  path: claimRoutes.vetVisitsReviewTestResults,
  options: {
    handler: async (request, h) => {
      const { vetVisitsReviewTestResults, typeOfLivestock } = getSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
      );
      const positiveNegativeRadios = radios(
        "",
        "vetVisitsReviewTestResults",
      )([
        { value: "positive", text: "Positive", checked: vetVisitsReviewTestResults === "positive" },
        { value: "negative", text: "Negative", checked: vetVisitsReviewTestResults === "negative" },
      ]);
      return h.view(claimViews.vetVisitsReviewTestResults, {
        typeOfLivestock,
        backLink: previousPageUrl(typeOfLivestock),
        ...positiveNegativeRadios,
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: claimRoutes.vetVisitsReviewTestResults,
  options: {
    validate: {
      payload: Joi.object({
        vetVisitsReviewTestResults: Joi.string().valid("positive", "negative").required(),
      }),
      failAction: async (request, h, err) => {
        request.logger.setBindings({ err });
        const { typeOfLivestock } = getSessionData(request, sessionEntryKeys.endemicsClaim);
        const positiveNegativeRadios = radios(
          "",
          "vetVisitsReviewTestResults",
          "Select a test result",
        )([
          { value: "positive", text: "Positive" },
          { value: "negative", text: "Negative" },
        ]);
        return h
          .view(claimViews.vetVisitsReviewTestResults, {
            ...request.payload,
            typeOfLivestock,
            backLink: previousPageUrl(typeOfLivestock),
            ...positiveNegativeRadios,
            errorMessage: {
              text: "Select a test result",
              href: "#vetVisitsReviewTestResults",
            },
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      },
    },
    handler: async (request, h) => {
      const { vetVisitsReviewTestResults } = request.payload;

      // TODO: Should emit event
      await setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.vetVisitsReviewTestResults,
        vetVisitsReviewTestResults,
      );
      // TODO: Should emit event
      await setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.reviewTestResults,
        vetVisitsReviewTestResults,
      );

      return h.redirect(nextPageURL(request));
    },
  },
};

export const vetVisitsReviewTestResultsHandlers = [getHandler, postHandler];

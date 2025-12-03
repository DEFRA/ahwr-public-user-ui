import Joi from "joi";
import {
  getSessionData,
  sessionEntryKeys,
  sessionKeys,
  setSessionData,
} from "../../session/index.js";
import { radios } from "../models/form-component/radios.js";
import HttpStatus from "http-status-codes";
import { claimRoutes, claimViews } from "../../constants/routes.js";
import { getEndemicsClaimDetails, getReviewType } from "../../lib/utils.js";

const previousPageUrl = (request) => {
  const { typeOfLivestock, typeOfReview } = getSessionData(request, sessionEntryKeys.endemicsClaim);
  const { isBeef, isDairy, isSheep, isPigs, isEndemicsFollowUp } = getEndemicsClaimDetails(
    typeOfLivestock,
    typeOfReview,
  );

  if (isEndemicsFollowUp) {
    if (isSheep) {
      return claimRoutes.diseaseStatus;
    }
    if (isBeef || isDairy) {
      return claimRoutes.testUrn;
    }
  }

  if (isPigs) {
    return claimRoutes.numberOfFluidOralSamples;
  }
  if (isBeef || isDairy) {
    return claimRoutes.testUrn;
  }

  return undefined; // if a review, and is for sheep, what should back page be? Can this ever happen?
};
const nextPageURL = (request) => {
  const { typeOfLivestock, typeOfReview } = getSessionData(request, sessionEntryKeys.endemicsClaim);
  const { isBeefOrDairyEndemics } = getEndemicsClaimDetails(typeOfLivestock, typeOfReview);

  if (isBeefOrDairyEndemics) {
    return claimRoutes.biosecurity;
  }

  return claimRoutes.checkAnswers;
};
const pageTitle = (request) => {
  const { typeOfReview } = getSessionData(request, sessionEntryKeys.endemicsClaim);
  const { isEndemicsFollowUp } = getReviewType(typeOfReview);
  return isEndemicsFollowUp ? "What was the follow-up test result?" : "What was the test result?";
};

const hintHtml = "You can find this on the summary the vet gave you.";

const getHandler = {
  method: "GET",
  path: claimRoutes.testResults,
  options: {
    handler: async (request, h) => {
      const { testResults } = getSessionData(request, sessionEntryKeys.endemicsClaim);
      const positiveNegativeRadios = radios(pageTitle(request), "testResults", undefined, {
        hintHtml,
      })([
        { value: "positive", text: "Positive", checked: testResults === "positive" },
        { value: "negative", text: "Negative", checked: testResults === "negative" },
      ]);
      return h.view(claimViews.testResults, {
        backLink: previousPageUrl(request),
        title: pageTitle(request),
        ...positiveNegativeRadios,
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: claimRoutes.testResults,
  options: {
    validate: {
      payload: Joi.object({
        testResults: Joi.string().valid("positive", "negative").required(),
      }),
      failAction: async (request, h, error) => {
        request.logger.error({ error });
        const positiveNegativeRadios = radios(
          pageTitle(request),
          "testResults",
          "Select a test result",
          { hintHtml },
        )([
          { value: "positive", text: "Positive" },
          { value: "negative", text: "Negative" },
        ]);
        return h
          .view(claimViews.testResults, {
            ...request.payload,
            title: pageTitle(request),
            backLink: previousPageUrl(request),
            ...positiveNegativeRadios,
            errorMessage: {
              text: "Select a test result",
              href: "#testResults",
            },
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      },
    },
    handler: async (request, h) => {
      const { testResults } = request.payload;

      await setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.testResults,
        testResults,
      );
      return h.redirect(nextPageURL(request));
    },
  },
};

export const testResultsHandlers = [getHandler, postHandler];

import Joi from "joi";
import {
  getSessionData,
  sessionEntryKeys,
  sessionKeys,
  setSessionData,
} from "../../../session/index.js";
import {
  isVisitDateAfterPIHuntAndDairyGoLive,
  isPigsAndPaymentsUserJourney,
} from "../../../lib/context-helper.js";
import HttpStatus from "http-status-codes";
import { getEndemicsClaimDetails, getTestResult } from "../../../lib/utils.js";
import { livestockClaimRoutes, livestockClaimViews } from "../../../constants/routes.js";
import { isURNUnique } from "../../../api-requests/claim-api.js";
import { sendInvalidDataEvent } from "../../../messaging/ineligibility-event-emission.js";

const ENTER_THE_URN = "Enter the URN";
const MAX_URN_LENGTH = 50;

const title = ({ typeOfLivestock, typeOfReview }) => {
  const { isBeefOrDairyEndemics } = getEndemicsClaimDetails(typeOfLivestock, typeOfReview);

  if (isBeefOrDairyEndemics) {
    return "What’s the laboratory unique reference number (URN) or certificate number of the test results?";
  }

  return "What’s the laboratory unique reference number (URN) for the test results?";
};

const previousPageUrl = ({ typeOfLivestock, typeOfReview, reviewTestResults, dateOfVisit }) => {
  const { isEndemicsFollowUp, isBeefOrDairyEndemics, isReview, isBeef, isDairy, isPigs } =
    getEndemicsClaimDetails(typeOfLivestock, typeOfReview);
  const { isPositive } = getTestResult(reviewTestResults);

  if (isVisitDateAfterPIHuntAndDairyGoLive(dateOfVisit) && isBeefOrDairyEndemics) {
    return livestockClaimRoutes.dateOfTesting;
  }
  if (isReview) {
    return livestockClaimRoutes.vetRcvs;
  }
  if (isEndemicsFollowUp && isPigs) {
    return livestockClaimRoutes.vaccination;
  }
  if ((isBeef || isDairy) && isPositive) {
    return livestockClaimRoutes.piHunt;
  }

  return livestockClaimRoutes.vetRcvs;
};

const nextPageUrl = ({ typeOfLivestock, typeOfReview, dateOfVisit }) => {
  const { isBeef, isDairy, isPigs, isReview, isEndemicsFollowUp } = getEndemicsClaimDetails(
    typeOfLivestock,
    typeOfReview,
  );

  if (isPigs && isReview) {
    if (isPigsAndPaymentsUserJourney(dateOfVisit)) {
      return livestockClaimRoutes.typeOfSamplesTaken;
    }
    return livestockClaimRoutes.numberOfFluidOralSamples;
  }
  if (isPigs && isEndemicsFollowUp) {
    return livestockClaimRoutes.numberOfSamplesTested;
  }
  if (isBeef || isDairy) {
    return livestockClaimRoutes.testResults;
  }

  return livestockClaimRoutes.checkAnswers;
};

const getHandler = {
  method: "GET",
  path: livestockClaimRoutes.testUrn,
  options: {
    handler: async (request, h) => {
      const { laboratoryURN, typeOfLivestock, typeOfReview, reviewTestResults, dateOfVisit } =
        getSessionData(request, sessionEntryKeys.endemicsClaim);

      return h.view(livestockClaimViews.testUrn, {
        title: title({ typeOfLivestock, typeOfReview }),
        laboratoryURN,
        backLink: previousPageUrl({
          typeOfLivestock,
          typeOfReview,
          reviewTestResults,
          dateOfVisit,
        }),
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: livestockClaimRoutes.testUrn,
  options: {
    validate: {
      payload: Joi.object({
        laboratoryURN: Joi.string()
          .trim()
          .max(MAX_URN_LENGTH)
          .pattern(/^[A-Za-z0-9-]+$/)
          .required()
          .messages({
            "any.required": ENTER_THE_URN,
            "string.base": ENTER_THE_URN,
            "string.empty": ENTER_THE_URN,
            "string.max": "URN must be 50 characters or fewer",
            "string.pattern.base": "URN must only include letters a to z, numbers and a hyphen",
          }),
      }),
      failAction: async (request, h, error) => {
        request.logger.error({ error });
        const { typeOfLivestock, typeOfReview, reviewTestResults, dateOfVisit } = getSessionData(
          request,
          sessionEntryKeys.endemicsClaim,
        );
        const { isBeefOrDairyEndemics } = getEndemicsClaimDetails(typeOfLivestock, typeOfReview);
        const errorMessage =
          error.details[0].message === ENTER_THE_URN && isBeefOrDairyEndemics
            ? "Enter the URN or certificate number"
            : error.details[0].message;

        return h
          .view(livestockClaimViews.testUrn, {
            ...request.payload,
            title: title({ typeOfLivestock, typeOfReview }),
            errorMessage: { text: errorMessage, href: "#laboratoryURN" },
            backLink: previousPageUrl({
              typeOfLivestock,
              typeOfReview,
              reviewTestResults,
              dateOfVisit,
            }),
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      },
    },
    handler: async (request, h) => {
      const { laboratoryURN } = request.payload;
      const organisation = getSessionData(request, sessionEntryKeys.organisation);
      const { typeOfLivestock, typeOfReview, dateOfVisit } = getSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
      );
      const { isBeefOrDairyEndemics } = getEndemicsClaimDetails(typeOfLivestock, typeOfReview);
      const response = await isURNUnique({ sbi: organisation.sbi, laboratoryURN }, request.logger);

      await setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.laboratoryURN,
        laboratoryURN,
      );

      if (!response?.isURNUnique) {
        await sendInvalidDataEvent({
          request,
          sessionKey: sessionKeys.endemicsClaim.laboratoryURN,
          exception: "urnReference entered is not unique",
        });

        return h
          .view(livestockClaimViews.testUrnException, {
            backLink: livestockClaimRoutes.testUrn,
            isBeefOrDairyEndemics,
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      }

      return h.redirect(nextPageUrl({ typeOfLivestock, typeOfReview, dateOfVisit }));
    },
  },
};

export const testUrnHandlers = [getHandler, postHandler];

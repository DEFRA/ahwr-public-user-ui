import Joi from "joi";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../../session/index.js";
import { livestockClaimRoutes, livestockClaimViews } from "../../../constants/routes.js";
import { getTestResult, getLivestockTypes } from "../../../lib/utils.js";
import { isVisitDateAfterPIHuntAndDairyGoLive } from "../../../lib/context-helper.js";
import HttpStatus from "http-status-codes";
import { claimConstants, PIGS } from "../../../constants/claim-constants.js";
import { sendInvalidDataEvent } from "../../../messaging/ineligibility-event-emission.js";

const YES_TO_ASSESSMENT_TEXT = "Select yes if the vet did a biosecurity assessment";

const {
  pigsFollowUpTest: { pcr },
} = claimConstants;

export const isPIHuntValidPositive = (isPositive, piHuntDone, piHuntAllAnimals, dateOfVisit) =>
  isPositive &&
  piHuntDone &&
  (isVisitDateAfterPIHuntAndDairyGoLive(dateOfVisit) ? piHuntAllAnimals : true);

const isPIHuntValidNegative = (isNegative, piHuntDone, piHuntRecommended, piHuntAllAnimals) =>
  isNegative && piHuntDone && piHuntRecommended && piHuntAllAnimals;

const isPIHuntValid = (
  isPositive,
  piHuntDone,
  piHuntAllAnimals,
  piHuntRecommended,
  isNegative,
  dateOfVisit,
) =>
  isPIHuntValidPositive(isPositive, piHuntDone, piHuntAllAnimals, dateOfVisit) ||
  isPIHuntValidNegative(isNegative, piHuntDone, piHuntRecommended, piHuntAllAnimals);

export const getBeefOrDairyPage = (endemicsClaimSession, isNegative, isPositive) => {
  const piHuntDone = endemicsClaimSession?.piHunt === "yes";
  const piHuntRecommended = endemicsClaimSession?.piHuntRecommended === "yes";
  const piHuntAllAnimals = endemicsClaimSession?.piHuntAllAnimals === "yes";

  if (isNegative) {
    if (!piHuntDone) {
      return livestockClaimRoutes.piHunt;
    }

    if (!piHuntRecommended) {
      return livestockClaimRoutes.piHuntRecommended;
    }

    if (piHuntRecommended && !piHuntAllAnimals) {
      return livestockClaimRoutes.piHuntAllAnimals;
    }
  }

  if (isPositive && piHuntDone && !piHuntAllAnimals) {
    return livestockClaimRoutes.piHuntAllAnimals;
  }

  if (
    isPIHuntValid(
      isPositive,
      piHuntDone,
      piHuntAllAnimals,
      piHuntRecommended,
      isNegative,
      endemicsClaimSession.dateOfVisit,
    )
  ) {
    return livestockClaimRoutes.testResults;
  }

  return livestockClaimRoutes.testResults;
};
export const previousPageUrl = (request) => {
  const endemicsClaimSession = getSessionData(request, sessionEntryKeys.endemicsClaim);
  const { isNegative, isPositive } = getTestResult(endemicsClaimSession.reviewTestResults);
  const { isBeef, isDairy, isPigs } = getLivestockTypes(endemicsClaimSession.typeOfLivestock);
  const dateOfVisit = endemicsClaimSession.dateOfVisit;

  if ((isBeef || isDairy) && isVisitDateAfterPIHuntAndDairyGoLive(dateOfVisit)) {
    return getBeefOrDairyPage(endemicsClaimSession, isNegative, isPositive);
  }

  if ((isBeef || isDairy) && isNegative) {
    return livestockClaimRoutes.vetRCVS;
  }

  if (isPigs) {
    return getBackPageForPigs(endemicsClaimSession);
  }

  return livestockClaimRoutes.testResults;
};

const getBackPageForPigs = (session) => {
  // This page might have been skipped, if they said the result was negative
  if (session?.pigsGeneticSequencing) {
    return livestockClaimRoutes.pigsGeneticSequencing;
  }

  if (session?.pigsFollowUpTest === pcr) {
    return livestockClaimRoutes.pigsPcrResult;
  }

  return livestockClaimRoutes.pigsElisaResult;
};

export const getAssessmentPercentageErrorMessage = (biosecurity, assessmentPercentage) => {
  if (biosecurity === undefined) {
    return undefined;
  }

  switch (true) {
    case assessmentPercentage === "":
      return "Enter the assessment percentage";
    case Number(assessmentPercentage) < 1:
      return "The assessment percentage must be a number between 1 and 100";
    case Number(assessmentPercentage) > 100:
      return "The assessment percentage must be a number between 1 and 100";
    default:
      return "The assessment percentage can only include numbers";
  }
};

const getHandler = {
  method: "GET",
  path: livestockClaimRoutes.biosecurity,
  options: {
    handler: async (request, h) => {
      const endemicsClaimSession = getSessionData(request, sessionEntryKeys.endemicsClaim);

      return h.view(livestockClaimViews.biosecurity, {
        previousAnswer: endemicsClaimSession?.biosecurity,
        typeOfLivestock: endemicsClaimSession?.typeOfLivestock,
        backLink: previousPageUrl(request),
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: livestockClaimRoutes.biosecurity,
  options: {
    validate: {
      payload: Joi.object({
        biosecurity: Joi.string()
          .valid("yes", "no")
          .required()
          .messages({ "any.required": YES_TO_ASSESSMENT_TEXT }),
        assessmentPercentage: Joi.when("biosecurity", {
          is: Joi.valid("yes"),
          then: Joi.string().pattern(/^(?!0$)(100|\d{1,2})$/),
        }),
      }),
      failAction: (request, h, error) => {
        request.logger.error({ error });
        const endemicsClaimSession = getSessionData(request, sessionEntryKeys.endemicsClaim);
        const { biosecurity, assessmentPercentage } = request.payload;
        const assessmentPercentageErrorMessage = getAssessmentPercentageErrorMessage(
          biosecurity,
          assessmentPercentage,
        );

        const errorMessage = biosecurity
          ? { text: assessmentPercentageErrorMessage, href: "#assessmentPercentage" }
          : { text: YES_TO_ASSESSMENT_TEXT, href: "#biosecurity" };
        const errors = {
          errorMessage,
          radioErrorMessage:
            biosecurity === undefined
              ? { text: YES_TO_ASSESSMENT_TEXT, href: "#biosecurity" }
              : undefined,
          inputErrorMessage: assessmentPercentageErrorMessage
            ? { text: assessmentPercentageErrorMessage, href: "#assessmentPercentage" }
            : undefined,
        };

        return h
          .view(livestockClaimViews.biosecurity, {
            backLink: previousPageUrl(request),
            typeOfLivestock: endemicsClaimSession?.typeOfLivestock,
            ...errors,
            previousAnswer: biosecurity,
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      },
    },
    handler: async (request, h) => {
      const typeOfLivestock = getSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.typeOfLivestock,
      );
      const { biosecurity, assessmentPercentage } = request.payload;

      await setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.biosecurity,
        typeOfLivestock === PIGS ? { biosecurity, assessmentPercentage } : biosecurity,
      );

      if (biosecurity === "no") {
        await sendInvalidDataEvent({
          request,
          sessionKey: sessionKeys.endemicsClaim.biosecurity,
          exception: `Value ${biosecurity} is not equal to required value yes`,
        });

        return h
          .view(livestockClaimViews.biosecurityException, {
            backLink: livestockClaimRoutes.biosecurity,
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      }

      return h.redirect(livestockClaimRoutes.checkAnswers);
    },
  },
};

export const biosecurityHandlers = [getHandler, postHandler];

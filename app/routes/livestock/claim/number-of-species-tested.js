import Joi from "joi";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../../session/index.js";
import { thresholds } from "../../../constants/claim-constants.js";
import { getReviewType, getLivestockTypes } from "../../../lib/utils.js";
import { isVisitDateAfterPIHuntAndDairyGoLive } from "../../../lib/context-helper.js";
import HttpStatus from "http-status-codes";
import { livestockClaimRoutes, livestockClaimViews } from "../../../constants/routes.js";
import { sendInvalidDataEvent } from "../../../messaging/ineligibility-event-emission.js";

const getTheQuestionText = (typeOfLivestock, typeOfReview) => {
  const { isReview } = getReviewType(typeOfReview);
  const { isSheep, isDairy, isPigs } = getLivestockTypes(typeOfLivestock);

  const questionTextOne = "How many animals were samples taken from?";
  const questionTextTwo = "How many animals were samples taken from or assessed?";
  const questionTextThree = "How many sheep were samples taken from or assessed?";

  if (isReview) {
    if (isDairy) {
      return questionTextTwo;
    }
    return questionTextOne;
  }

  if (isSheep) {
    return questionTextThree;
  }
  if (isPigs) {
    return questionTextOne;
  }

  return questionTextTwo;
};

const getHandler = {
  method: "GET",
  path: livestockClaimRoutes.numberOfSpeciesTested,
  options: {
    handler: async (request, h) => {
      const { numberAnimalsTested, typeOfLivestock, typeOfReview } = getSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
      );

      return h.view(livestockClaimViews.numberOfSpeciesTested, {
        questionText: getTheQuestionText(typeOfLivestock, typeOfReview),
        numberAnimalsTested,
        backLink: livestockClaimRoutes.speciesNumbers,
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: livestockClaimRoutes.numberOfSpeciesTested,
  options: {
    validate: {
      payload: Joi.object({
        numberAnimalsTested: Joi.string().pattern(/^\d+$/).max(4).required().messages({
          "string.base": "Enter the number of animals tested or assessed",
          "string.empty": "Enter the number of animals tested or assessed",
          "string.max": "The number of animals tested should not exceed 9999",
          "string.pattern.base":
            "The amount of animals samples were taken from must only include numbers",
        }),
      }),
      failAction: async (request, h, error) => {
        const { typeOfLivestock, typeOfReview } = getSessionData(
          request,
          sessionEntryKeys.endemicsClaim,
        );

        return h
          .view(livestockClaimViews.numberOfSpeciesTested, {
            ...request.payload,
            backLink: livestockClaimRoutes.speciesNumbers,
            questionText: getTheQuestionText(typeOfLivestock, typeOfReview),
            errorMessage: {
              text: error.details[0].message,
              href: "#numberAnimalsTested",
            },
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      },
    },
    handler: async (request, h) => {
      const { numberAnimalsTested } = request.payload;
      const { typeOfLivestock, typeOfReview, dateOfVisit } = getSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
      );

      const numOfAnimalsTested = Number(numberAnimalsTested);
      const { isPigs, isSheep } = getLivestockTypes(typeOfLivestock);
      const { isEndemicsFollowUp } = getReviewType(typeOfReview);
      const threshold = thresholds.numberOfSpeciesTested[typeOfLivestock][typeOfReview];

      if (numOfAnimalsTested === 0) {
        return h
          .view(livestockClaimViews.numberOfSpeciesTested, {
            ...request.payload,
            backLink: livestockClaimRoutes.speciesNumbers,
            questionText: getTheQuestionText(typeOfLivestock, typeOfReview),
            errorMessage: {
              text: "The number of animals tested cannot be 0",
              href: "#numberAnimalsTested",
            },
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      }

      const isEligible =
        isPigs && isEndemicsFollowUp
          ? numOfAnimalsTested === threshold
          : numOfAnimalsTested >= threshold;

      await setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.numberAnimalsTested,
        numberAnimalsTested,
      );

      if (isEligible) {
        return h.redirect(livestockClaimRoutes.vetName);
      }

      const exceptionMessage =
        isPigs && isEndemicsFollowUp
          ? `Value ${numOfAnimalsTested} is not equal to required value ${threshold} for ${typeOfLivestock}`
          : `Value ${numOfAnimalsTested} is less than required value ${threshold} for ${typeOfLivestock}`;

      await sendInvalidDataEvent({
        request,
        sessionKey: sessionKeys.endemicsClaim.numberAnimalsTested,
        exception: exceptionMessage,
      });

      if (isPigs && isEndemicsFollowUp) {
        return h
          .view(livestockClaimViews.numberOfSpeciesPigsException, {
            continueClaimLink: livestockClaimRoutes.vetName,
            backLink: livestockClaimRoutes.numberOfSpeciesTested,
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      }

      if (isSheep) {
        return h
          .view(livestockClaimViews.numberOfSpeciesSheepException, {
            continueClaimLink: livestockClaimRoutes.vetName,
            backLink: livestockClaimRoutes.numberOfSpeciesTested,
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      }

      return h
        .view(livestockClaimViews.numberOfSpeciesException, {
          backLink: livestockClaimRoutes.numberOfSpeciesTested,
          piHuntEnabled: isVisitDateAfterPIHuntAndDairyGoLive(dateOfVisit),
        })
        .code(HttpStatus.BAD_REQUEST)
        .takeover();
    },
  },
};

export const numberOfSpeciesTestedHandlers = [getHandler, postHandler];

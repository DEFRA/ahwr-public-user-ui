import Joi from "joi";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../../session/index.js";
import { getTestResult } from "../../../lib/utils.js";
import { clearPiHuntSessionOnChange } from "../../../lib/clear-pi-hunt-session-on-change.js";
import { isVisitDateAfterPIHuntAndDairyGoLive } from "../../../lib/context-helper.js";
import HttpStatus from "http-status-codes";
import { livestockClaimRoutes, livestockClaimViews } from "../../../constants/routes.js";
import { claimType } from "ffc-ahwr-common-library";
import { sendInvalidDataEvent } from "../../../messaging/ineligibility-event-emission.js";

const getHandler = {
  method: "GET",
  path: livestockClaimRoutes.piHunt,
  options: {
    handler: async (request, h) => {
      const { piHunt: previousPiHuntAnswer, dateOfVisit } = getSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
      );

      const titleText = isVisitDateAfterPIHuntAndDairyGoLive(dateOfVisit)
        ? "Was a persistently infected (PI) hunt for bovine viral diarrhoea (BVD) done?"
        : "Was a persistently infected (PI) hunt for bovine viral diarrhoea (BVD) done on all animals in the herd?";

      return h.view(livestockClaimViews.piHunt, {
        titleText,
        backLink: livestockClaimRoutes.vetRcvs,
        previousAnswer: previousPiHuntAnswer,
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: livestockClaimRoutes.piHunt,
  options: {
    validate: {
      payload: Joi.object({
        piHunt: Joi.string().valid("yes", "no").required(),
      }),
      failAction: (request, h, error) => {
        request.logger.error({ error });
        const { piHunt: previousPiHuntAnswer, dateOfVisit } = getSessionData(
          request,
          sessionEntryKeys.endemicsClaim,
        );

        const titleText = isVisitDateAfterPIHuntAndDairyGoLive(dateOfVisit)
          ? "Was a persistently infected (PI) hunt for bovine viral diarrhoea (BVD) done?"
          : "Was a persistently infected (PI) hunt for bovine viral diarrhoea (BVD) done on all animals in the herd?";

        return h
          .view(livestockClaimViews.piHunt, {
            titleText,
            backLink: livestockClaimRoutes.vetRcvs,
            previousAnswer: previousPiHuntAnswer,
            errorMessage: { text: "Select yes if a PI hunt was done", href: "#piHunt" },
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      },
    },
    handler: async (request, h) => {
      const {
        reviewTestResults,
        piHunt: previousAnswer,
        relevantReviewForEndemics,
        dateOfVisit,
      } = getSessionData(request, sessionEntryKeys.endemicsClaim);
      const { isNegative, isPositive } = getTestResult(reviewTestResults);
      const answer = request.payload.piHunt;
      const piHuntEnabledAndVisitDateAfterGoLive =
        isVisitDateAfterPIHuntAndDairyGoLive(dateOfVisit);

      await setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.piHunt,
        answer,
      );

      if (answer !== "yes") {
        await sendInvalidDataEvent({
          request,
          sessionKey: sessionKeys.endemicsClaim.piHunt,
          exception: `Value '${answer}' is not equal to required value yes`,
        });

        if (isFollowUpOfNewWorldReview(relevantReviewForEndemics) && answer !== previousAnswer) {
          clearPiHuntSessionOnChange(request, "piHunt");
        }

        if (piHuntEnabledAndVisitDateAfterGoLive && isNegative) {
          return h.redirect(livestockClaimRoutes.biosecurity);
        }

        return h
          .view(livestockClaimViews.piHuntException, { backLink: livestockClaimRoutes.piHunt })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      }

      if (piHuntEnabledAndVisitDateAfterGoLive && isPositive) {
        return h.redirect(livestockClaimRoutes.piHuntAllAnimals);
      }
      if (piHuntEnabledAndVisitDateAfterGoLive && isNegative) {
        return h.redirect(livestockClaimRoutes.piHuntRecommended);
      }

      return h.redirect(livestockClaimRoutes.testUrn);
    },
  },
};

const isFollowUpOfNewWorldReview = (relevantReviewForEndemics) => {
  return relevantReviewForEndemics.type === claimType.review;
};

export const piHuntHandlers = [getHandler, postHandler];

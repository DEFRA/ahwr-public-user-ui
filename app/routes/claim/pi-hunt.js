import Joi from "joi";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../session/index.js";
import { getTestResult } from "../../lib/utils.js";
import { clearPiHuntSessionOnChange } from "../../lib/clear-pi-hunt-session-on-change.js";
import { isVisitDateAfterPIHuntAndDairyGoLive } from "../../lib/context-helper.js";
import HttpStatus from "http-status-codes";
import { claimRoutes, claimViews } from "../../constants/routes.js";
import { claimType } from "ffc-ahwr-common-library";

const getHandler = {
  method: "GET",
  path: "/pi-hunt",
  options: {
    handler: async (request, h) => {
      const { piHunt: previousPiHuntAnswer, dateOfVisit } = getSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
      );

      const titleText = isVisitDateAfterPIHuntAndDairyGoLive(dateOfVisit)
        ? "Was a persistently infected (PI) hunt for bovine viral diarrhoea (BVD) done?"
        : "Was a persistently infected (PI) hunt for bovine viral diarrhoea (BVD) done on all animals in the herd?";

      return h.view(claimViews.piHunt, {
        titleText,
        backLink: claimRoutes.vetRcvs,
        previousAnswer: previousPiHuntAnswer,
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: "/pi-hunt",
  options: {
    validate: {
      payload: Joi.object({
        piHunt: Joi.string().valid("yes", "no").required(),
      }),
      failAction: (request, h, err) => {
        request.logger.setBindings({ error: err });
        const { piHunt: previousPiHuntAnswer, dateOfVisit } = getSessionData(
          request,
          sessionEntryKeys.endemicsClaim,
        );

        const titleText = isVisitDateAfterPIHuntAndDairyGoLive(dateOfVisit)
          ? "Was a persistently infected (PI) hunt for bovine viral diarrhoea (BVD) done?"
          : "Was a persistently infected (PI) hunt for bovine viral diarrhoea (BVD) done on all animals in the herd?";

        return h
          .view(claimViews.piHunt, {
            titleText,
            backLink: claimRoutes.vetRcvs,
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

      setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.piHunt,
        answer,
      );

      if (answer === "no") {
        // TODO - raise invalid data event

        if (isFollowUpOfNewWorldReview(relevantReviewForEndemics) && answer !== previousAnswer) {
          clearPiHuntSessionOnChange(request, "piHunt");
        }

        if (piHuntEnabledAndVisitDateAfterGoLive && isNegative) {
          return h.redirect(claimRoutes.biosecurity);
        }

        return h
          .view(claimViews.piHuntException, { backLink: claimRoutes.piHunt })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      }

      if (piHuntEnabledAndVisitDateAfterGoLive && isPositive) {
        return h.redirect(claimRoutes.piHuntAllAnimals);
      }
      if (piHuntEnabledAndVisitDateAfterGoLive && isNegative) {
        return h.redirect(claimRoutes.piHuntRecommended);
      }

      return h.redirect(claimRoutes.testUrn);
    },
  },
};

const isFollowUpOfNewWorldReview = (relevantReviewForEndemics) => {
  return relevantReviewForEndemics.type === claimType.review;
};

export const piHuntHandlers = [getHandler, postHandler];

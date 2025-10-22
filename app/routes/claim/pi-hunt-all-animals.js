import Joi from "joi";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../session/index.js";
import { radios } from "../../models/form-component/radios.js";
import { getTestResult } from "../../lib/utils.js";
import { clearPiHuntSessionOnChange } from "../../lib/clear-pi-hunt-session-on-change.js";
import HttpStatus from "http-status-codes";
import { claimRoutes, claimViews } from "../../constants/routes.js";
import { getAmount } from "../../lib/prices-helper.js";

const backLink = (reviewTestResults) => {
  const { isPositive } = getTestResult(reviewTestResults);
  return isPositive ? claimRoutes.piHunt : claimRoutes.piHuntRecommended;
};

const getQuestionText = (typeOfLivestock) =>
  `Was the PI hunt done on all ${typeOfLivestock} cattle in the herd?`;

const hintHtml = "You can find this on the summary the vet gave you.";

const getHandler = {
  method: "GET",
  path: "/pi-hunt-all-animals",
  options: {
    handler: async (request, h) => {
      const { typeOfLivestock, piHuntAllAnimals, reviewTestResults } = getSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
      );
      const questionText = getQuestionText(typeOfLivestock);
      const yesOrNoRadios = radios(questionText, "piHuntAllAnimals", undefined, {
        hintHtml,
        inline: true,
      })([
        { value: "yes", text: "Yes", checked: piHuntAllAnimals === "yes" },
        { value: "no", text: "No", checked: piHuntAllAnimals === "no" },
      ]);
      return h.view(claimViews.piHuntAllAnimals, {
        backLink: backLink(reviewTestResults),
        title: questionText,
        ...yesOrNoRadios,
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: "/pi-hunt-all-animals",
  options: {
    validate: {
      payload: Joi.object({
        piHuntAllAnimals: Joi.string().valid("yes", "no").required(),
      }),
      failAction: async (request, h, _error) => {
        const { typeOfLivestock, piHuntAllAnimals, reviewTestResults } = getSessionData(
          request,
          sessionEntryKeys.endemicsClaim,
        );
        const errorText = `Select yes if the PI hunt was done on all ${typeOfLivestock} cattle in the herd`;
        const questionText = getQuestionText(typeOfLivestock);
        const yesOrNoRadios = radios(questionText, "piHuntAllAnimals", errorText, {
          hintHtml,
          inline: true,
        })([
          { value: "yes", text: "Yes", checked: piHuntAllAnimals === "yes" },
          { value: "no", text: "No", checked: piHuntAllAnimals === "no" },
        ]);

        return h
          .view(claimViews.piHuntAllAnimals, {
            ...yesOrNoRadios,
            backLink: backLink(reviewTestResults),
            title: questionText,
            errorMessage: {
              text: errorText,
              href: "#piHuntAllAnimals",
            },
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      },
    },
    handler: async (request, h) => {
      const {
        typeOfReview,
        reviewTestResults,
        typeOfLivestock,
        piHunt,
        piHuntAllAnimals: previousAnswer,
        dateOfVisit,
      } = getSessionData(request, sessionEntryKeys.endemicsClaim);
      const { piHuntAllAnimals } = request.payload;

      setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.piHuntAllAnimals,
        piHuntAllAnimals,
      );

      if (piHuntAllAnimals === "no") {
        const claimPaymentNoPiHunt = getAmount(
          {
            type: typeOfReview,
            typeOfLivestock,
            reviewTestResults,
            piHunt,
            piHuntAllAnimals: "no",
            dateOfVisit,
          }
        );
        // TODO - raise invalid data event

        if (piHuntAllAnimals !== previousAnswer) {
          clearPiHuntSessionOnChange(request, "piHuntAllAnimals");
        }

        return h
          .view(claimViews.piHuntAllAnimalsException, {
            reviewTestResults,
            claimPaymentNoPiHunt,
            livestockText: typeOfLivestock,
            continueClaimLink: claimRoutes.biosecurity,
            backLink: claimRoutes.piHuntAllAnimalsException,
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      }

      return h.redirect(claimRoutes.dateOfTesting);
    },
  },
};

export const piHuntAllAnimalsHandlers = [getHandler, postHandler];

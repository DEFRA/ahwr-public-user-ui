import Joi from "joi";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../session/index.js";
import { radios } from "../../models/form-component/radios.js";
import { clearPiHuntSessionOnChange } from "../../lib/clear-pi-hunt-session-on-change.js";
import { getAmount } from "../../api-requests/claim-api.js";
import HttpStatus from "http-status-codes";
import { claimRoutes, claimViews } from "../../constants/routes.js";

const questionText = "Was the PI hunt recommended by the vet?";
const hintHtml = "You can find this on the summary the vet gave you.";

const getHandler = {
  method: "GET",
  path: "/pi-hunt-recommended",
  options: {
    handler: async (request, h) => {
      const piHuntRecommended = getSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.piHuntRecommended,
      );

      const yesOrNoRadios = radios(questionText, "piHuntRecommended", undefined, {
        hintHtml,
        inline: true,
      })([
        { value: "yes", text: "Yes", checked: piHuntRecommended === "yes" },
        { value: "no", text: "No", checked: piHuntRecommended === "no" },
      ]);

      return h.view(claimViews.piHuntRecommended, {
        backLink: claimRoutes.piHunt,
        title: questionText,
        ...yesOrNoRadios,
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: "/pi-hunt-recommended",
  options: {
    validate: {
      payload: Joi.object({
        piHuntRecommended: Joi.string().valid("yes", "no").required(),
      }),
      failAction: async (request, h, _error) => {
        const piHuntRecommended = getSessionData(
          request,
          sessionEntryKeys.endemicsClaim,
          sessionKeys.endemicsClaim.piHuntRecommended,
        );
        const errorText = "Select yes if the vet recommended the PI hunt";
        const yesOrNoRadios = radios(questionText, "piHuntRecommended", errorText, {
          hintHtml,
          inline: true,
        })([
          { value: "yes", text: "Yes", checked: piHuntRecommended === "yes" },
          { value: "no", text: "No", checked: piHuntRecommended === "no" },
        ]);

        return h
          .view(claimViews.piHuntRecommended, {
            ...yesOrNoRadios,
            backLink: claimRoutes.piHunt,
            title: questionText,
            errorMessage: {
              text: errorText,
              href: "#piHuntRecommended",
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
        piHuntRecommended: previousAnswer,
        dateOfVisit,
      } = getSessionData(request, sessionEntryKeys.endemicsClaim);
      const { piHuntRecommended } = request.payload;
      setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.piHuntRecommended,
        piHuntRecommended,
      );

      if (piHuntRecommended === "no") {
        const claimPaymentNoPiHunt = await getAmount(
          {
            type: typeOfReview,
            typeOfLivestock,
            reviewTestResults,
            piHunt,
            piHuntAllAnimals: "no",
            dateOfVisit,
          },
          request.logger,
        );
        // TODO - raise invalid data event

        if (piHuntRecommended !== previousAnswer) {
          clearPiHuntSessionOnChange(request, "piHuntRecommended");
        }

        return h
          .view(claimViews.piHuntRecommendedException, {
            claimPaymentNoPiHunt,
            continueClaimLink: claimRoutes.biosecurity,
            backLink: claimRoutes.piHuntRecommended,
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      }

      return h.redirect(claimRoutes.piHuntAllAnimals);
    },
  },
};

export const piHuntRecommendedHandlers = [getHandler, postHandler];

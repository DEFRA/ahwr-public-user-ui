import Joi from "joi";
import {
  getEndemicsClaimDetails,
  getLivestockTypes,
  getReviewType,
  getTestResult,
} from "../../../lib/utils.js";
import { getSpeciesEligibleNumberForDisplay } from "../../../lib/display-helpers.js";
import { getYesNoRadios } from "../../models/form-component/yes-no-radios.js";
import {
  getHerdBackLink,
  isMultipleHerdsUserJourney,
  isVisitDateAfterPIHuntAndDairyGoLive,
} from "../../../lib/context-helper.js";
import HttpStatus from "http-status-codes";
import {
  getSessionData,
  sessionEntryKeys,
  sessionKeys,
  setSessionData,
} from "../../../session/index.js";
import { livestockClaimRoutes, livestockClaimViews } from "../../../constants/routes.js";
import { sendInvalidDataEvent } from "../../../messaging/ineligibility-event-emission.js";

const backLink = (request) => {
  const {
    reviewTestResults,
    typeOfLivestock,
    typeOfReview,
    dateOfVisit,
    previousClaims,
    latestEndemicsApplication,
  } = getSessionData(request, sessionEntryKeys.endemicsClaim);
  const { isBeefOrDairyEndemics, isBeef, isDairy } = getEndemicsClaimDetails(
    typeOfLivestock,
    typeOfReview,
  );
  const { isNegative } = getTestResult(reviewTestResults);

  if (isMultipleHerdsUserJourney(dateOfVisit, latestEndemicsApplication.flags)) {
    return getHerdBackLink(typeOfLivestock, previousClaims);
  }

  if (
    isVisitDateAfterPIHuntAndDairyGoLive(
      getSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.dateOfVisit,
      ),
    ) &&
    isBeefOrDairyEndemics
  ) {
    return livestockClaimRoutes.dateOfVisit;
  }
  if ((isDairy || isBeef) && isNegative) {
    return livestockClaimRoutes.dateOfVisit;
  }

  return livestockClaimRoutes.dateOfTesting;
};

const hintHtml = "You can find this on the summary the vet gave you.";

const radioOptions = {
  isPageHeading: true,
  legendClasses: "govuk-fieldset__legend--l",
  inline: true,
  hintText: hintHtml,
};
const isEndemicsClaims = true;
const sheepNumbersExceptionsText = {
  R: "review",
  E: "follow-up",
};
const getHerdText = (typeOfLivestock) =>
  typeOfLivestock !== "sheep" ? "in this herd" : "in this flock";
const errorMessageText = (
  typeOfReview,
  speciesEligibleNumberForDisplay,
  typeOfLivestock,
  dateOfVisit,
  latestEndemicsApplication,
) => {
  const { isReview } = getReviewType(typeOfReview);
  const claimTypeText = isReview ? "review" : "follow-up";
  const herdText = getHerdText(typeOfLivestock);

  return isMultipleHerdsUserJourney(dateOfVisit, latestEndemicsApplication.flags)
    ? `Select yes if you had ${speciesEligibleNumberForDisplay}${herdText} on the date of the ${claimTypeText}`
    : `Select yes if you had ${speciesEligibleNumberForDisplay} on the date of the ${claimTypeText}`;
};
const legendText = (
  speciesEligibleNumberForDisplay,
  typeOfReview,
  typeOfLivestock,
  dateOfVisit,
  latestEndemicsApplication,
) => {
  const { isReview } = getReviewType(typeOfReview);
  const claimTypeText = isReview ? "review" : "follow-up";
  const herdText = isMultipleHerdsUserJourney(dateOfVisit, latestEndemicsApplication.flags)
    ? getHerdText(typeOfLivestock)
    : "";

  return `Did you have ${speciesEligibleNumberForDisplay}${herdText} on the date of the ${claimTypeText}?`;
};

const getHandler = {
  method: "GET",
  path: livestockClaimRoutes.speciesNumbers,
  options: {
    handler: async (request, h) => {
      const claim = getSessionData(request, sessionEntryKeys.endemicsClaim);

      if (!claim) {
        throw new Error("No claim found in session");
      }

      const speciesEligibleNumberForDisplay = getSpeciesEligibleNumberForDisplay(
        claim,
        isEndemicsClaims,
      );

      const questionText = legendText(
        speciesEligibleNumberForDisplay,
        claim.typeOfReview,
        claim?.typeOfLivestock,
        claim.dateOfVisit,
        claim.latestEndemicsApplication,
      );

      const { isReview } = getReviewType(claim.typeOfReview);
      const reviewOrFollowUp = isReview ? "review" : "follow-up";

      return h.view(livestockClaimViews.speciesNumbers, {
        backLink: backLink(request),
        customisedTitle: `Minimum number of livestock on date of ${reviewOrFollowUp}?`,
        ...getYesNoRadios(
          questionText,
          sessionKeys.endemicsClaim.speciesNumbers,
          claim.speciesNumbers,
          undefined,
          radioOptions,
        ),
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: livestockClaimRoutes.speciesNumbers,
  options: {
    validate: {
      payload: Joi.object({
        [sessionKeys.endemicsClaim.speciesNumbers]: Joi.string().valid("yes", "no").required(),
      }),
      failAction: (request, h, error) => {
        request.logger.error({ error });
        const claim = getSessionData(request, sessionEntryKeys.endemicsClaim);

        if (!claim) {
          throw new Error("No claim found in session");
        }

        const speciesEligibleNumberForDisplay = getSpeciesEligibleNumberForDisplay(
          claim,
          isEndemicsClaims,
        );

        return h
          .view(livestockClaimViews.speciesNumbers, {
            backLink: backLink(request),
            errorMessage: {
              text: errorMessageText(
                claim.typeOfReview,
                speciesEligibleNumberForDisplay,
                claim.typeOfLivestock,
                claim.dateOfVisit,
                claim.latestEndemicsApplication,
              ),
            },
            ...getYesNoRadios(
              legendText(
                speciesEligibleNumberForDisplay,
                claim.typeOfReview,
                claim?.typeOfLivestock,
                claim.dateOfVisit,
                claim.latestEndemicsApplication,
              ),
              sessionKeys.endemicsClaim.speciesNumbers,
              claim.speciesNumbers,
              errorMessageText(
                claim?.typeOfReview,
                speciesEligibleNumberForDisplay,
                claim?.typeOfLivestock,
                claim.dateOfVisit,
                claim.latestEndemicsApplication,
              ),
              radioOptions,
            ),
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      },
    },
    handler: async (request, h) => {
      const { typeOfLivestock, typeOfReview } = getSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
      );
      const { isBeef, isDairy } = getLivestockTypes(typeOfLivestock);
      const { isReview, isEndemicsFollowUp } = getReviewType(typeOfReview);
      const answer = request.payload[sessionKeys.endemicsClaim.speciesNumbers];

      await setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.speciesNumbers,
        answer,
      );

      if (answer === "yes") {
        if (isDairy || (isBeef && isEndemicsFollowUp)) {
          return h.redirect(livestockClaimRoutes.vetName);
        }

        return h.redirect(livestockClaimRoutes.numberOfSpeciesTested);
      }

      await sendInvalidDataEvent({
        request,
        sessionKey: sessionKeys.endemicsClaim.speciesNumbers,
        exception: `Value ${answer} is not equal to required value yes`,
      });

      return h
        .view(livestockClaimViews.speciesNumbersException, {
          backLink: livestockClaimRoutes.speciesNumbers,
          changeYourAnswerText: sheepNumbersExceptionsText[typeOfReview],
          isReview,
        })
        .code(HttpStatus.BAD_REQUEST)
        .takeover();
    },
  },
};

export const speciesNumbersHandlers = [getHandler, postHandler];

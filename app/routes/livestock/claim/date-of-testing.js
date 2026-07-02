import Joi from "joi";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../../session/index.js";
import { getReviewType, getLivestockTypes } from "../../../lib/utils.js";

import { validateDateParts } from "../../../lib/date-validations.js";
import { getReviewWithinLast10Months } from "../../../lib/claim-helper.js";
import {
  getReviewHerdId,
  isMultipleHerdsUserJourney,
  isVisitDateAfterPIHuntAndDairyGoLive,
  getHerdBackLink,
  isWithin4MonthsBeforeOrAfterDateOfVisit,
} from "../../../lib/context-helper.js";
import HttpStatus from "http-status-codes";
import { claimRoutes, claimViews } from "../../../constants/routes.js";
import { claimType } from "ffc-ahwr-common-library";
import { sendInvalidDataEvent } from "../../../messaging/ineligibility-event-emission.js";

const anchorTestingDate = "#whenTestingWasCarriedOut";

const backLink = (request) => {
  const { typeOfLivestock, typeOfReview, dateOfVisit, previousClaims, latestEndemicsApplication } =
    getSessionData(request, sessionEntryKeys.endemicsClaim);
  const { isEndemicsFollowUp } = getReviewType(typeOfReview);
  const { isBeef, isDairy } = getLivestockTypes(typeOfLivestock);

  if (
    isVisitDateAfterPIHuntAndDairyGoLive(dateOfVisit) &&
    isEndemicsFollowUp &&
    (isBeef || isDairy)
  ) {
    return claimRoutes.piHuntAllAnimals;
  }

  if (isMultipleHerdsUserJourney(dateOfVisit, latestEndemicsApplication.flags)) {
    return getHerdBackLink(typeOfLivestock, previousClaims);
  }

  return claimRoutes.dateOfVisit;
};

const optionSameReviewOrFollowUpDateText = (typeOfReview) => {
  const { isReview } = getReviewType(typeOfReview);
  const reviewOrFollowUpText = isReview ? "review" : "follow-up";
  return `When the vet last visited the farm for the ${reviewOrFollowUpText}`;
};

const getTheQuestionAndHintText = (typeOfReview, typeOfLivestock) => {
  const { isEndemicsFollowUp } = getReviewType(typeOfReview);
  const { isSheep } = getLivestockTypes(typeOfLivestock);
  const reviewOrFollowUpText = isEndemicsFollowUp ? "follow-up" : "review";

  if (isEndemicsFollowUp && isSheep) {
    return {
      questionText: "When were samples taken or sheep assessed?",
      questionHintText:
        "This is the last date samples were taken or sheep assessed for this follow-up. You can find it on the summary the vet gave you.",
    };
  }

  return {
    questionText: "When were samples taken?",
    questionHintText: `This is the date samples were last taken for this ${reviewOrFollowUpText}. You can find it on the summary the vet gave you.`,
  };
};

const onAnotherDateInputId = "on-another-date";
const dateOfSamplingText = "Date of sampling";
const DATE_PARTS_COUNT = 3;

const getHandler = {
  method: "GET",
  path: claimRoutes.dateOfTesting,
  options: {
    handler: async (request, h) => {
      const {
        dateOfVisit,
        dateOfTesting,
        latestEndemicsApplication,
        typeOfReview,
        typeOfLivestock,
      } = getSessionData(request, sessionEntryKeys.endemicsClaim);
      const { questionText, questionHintText } = getTheQuestionAndHintText(
        typeOfReview,
        typeOfLivestock,
      );
      return h.view(claimViews.dateOfTesting, {
        optionSameReviewOrFollowUpDateText: optionSameReviewOrFollowUpDateText(typeOfReview),
        questionText,
        questionHintText,
        dateOfAgreementAccepted: new Date(latestEndemicsApplication.createdAt)
          .toISOString()
          .slice(0, 10),
        dateOfVisit,
        whenTestingWasCarriedOut: dateOfTesting
          ? {
              value:
                dateOfVisit === dateOfTesting
                  ? "whenTheVetVisitedTheFarmToCarryOutTheReview"
                  : "onAnotherDate",
              onAnotherDate: {
                day: {
                  value: new Date(dateOfTesting).getDate(),
                },
                month: {
                  value: new Date(dateOfTesting).getMonth() + 1,
                },
                year: {
                  value: new Date(dateOfTesting).getFullYear(),
                },
              },
            }
          : {
              dateOfVisit,
            },
        backLink: backLink(request),
      });
    },
  },
};

const resolveDateOfTesting = (request, dateOfVisit) =>
  request.payload.whenTestingWasCarriedOut === "whenTheVetVisitedTheFarmToCarryOutTheReview"
    ? dateOfVisit
    : new Date(
        request.payload[`${onAnotherDateInputId}-year`],
        request.payload[`${onAnotherDateInputId}-month`] - 1,
        request.payload[`${onAnotherDateInputId}-day`],
      );

const renderDateOfTestingError = (request, h, { errorSummary, whenTestingWasCarriedOut }) => {
  const { dateOfVisit, typeOfReview, typeOfLivestock } = getSessionData(
    request,
    sessionEntryKeys.endemicsClaim,
  );
  const { questionText, questionHintText } = getTheQuestionAndHintText(
    typeOfReview,
    typeOfLivestock,
  );

  return h
    .view(claimViews.dateOfTesting, {
      ...request.payload,
      dateOfVisit,
      errorSummary,
      questionText,
      questionHintText,
      optionSameReviewOrFollowUpDateText: optionSameReviewOrFollowUpDateText(typeOfReview),
      whenTestingWasCarriedOut,
      backLink: backLink(request),
    })
    .code(HttpStatus.BAD_REQUEST)
    .takeover();
};

const buildSamplingDateError = (request, errorMessage) => ({
  errorSummary: [{ text: errorMessage, href: anchorTestingDate }],
  whenTestingWasCarriedOut: {
    value: request.payload.whenTestingWasCarriedOut,
    errorMessage: null,
    onAnotherDate: {
      day: { value: request.payload[`${onAnotherDateInputId}-day`], error: true },
      month: { value: request.payload[`${onAnotherDateInputId}-month`], error: true },
      year: { value: request.payload[`${onAnotherDateInputId}-year`], error: true },
      errorMessage,
    },
  },
});

const validateSamplingDate = (request, dateOfTesting) => {
  if (request.payload.whenTestingWasCarriedOut !== "onAnotherDate") {
    return undefined;
  }

  if (dateOfTesting > new Date()) {
    return buildSamplingDateError(request, "The date samples were taken must be in the past");
  }

  const dateOfAgreementAccepted = new Date(request.payload.dateOfAgreementAccepted);
  if (dateOfTesting < dateOfAgreementAccepted) {
    return buildSamplingDateError(
      request,
      "The date samples were taken must be the same as or after the date of your agreement",
    );
  }

  return undefined;
};

const postPayloadSchema = Joi.object({
  dateOfAgreementAccepted: Joi.string().required(),
  dateOfVisit: Joi.string().required(),
  whenTestingWasCarriedOut: Joi.string()
    .valid("whenTheVetVisitedTheFarmToCarryOutTheReview", "onAnotherDate")
    .required()
    .messages({
      "any.required": "Enter the date samples were taken",
    }),
  [`${onAnotherDateInputId}-day`]: Joi.string().allow("").default(""),
  [`${onAnotherDateInputId}-month`]: Joi.string().allow("").default(""),
  [`${onAnotherDateInputId}-year`]: Joi.string().allow("").default(""),
});

const datePartsMessage = ({ reason, missing }) => {
  if (reason === "incomplete") {
    return missing.length === DATE_PARTS_COUNT
      ? "Enter the date samples were taken"
      : `${dateOfSamplingText} must include a ${missing.join(" and a ")}`;
  }
  if (reason === "year") {
    return "Year must include 4 numbers";
  }
  return `${dateOfSamplingText} must be a real date`;
};

const buildDatePartsError = (request, partsError) => {
  const message = datePartsMessage(partsError);
  const { day, month, year } = partsError.inputsInError;
  return {
    errorSummary: [{ text: message, href: anchorTestingDate }],
    whenTestingWasCarriedOut: {
      value: request.payload.whenTestingWasCarriedOut,
      errorMessage: null,
      onAnotherDate: {
        day: { value: request.payload[`${onAnotherDateInputId}-day`], error: day },
        month: { value: request.payload[`${onAnotherDateInputId}-month`], error: month },
        year: { value: request.payload[`${onAnotherDateInputId}-year`], error: year },
        errorMessage: message,
      },
    },
  };
};

const postHandler = {
  method: "POST",
  path: claimRoutes.dateOfTesting,
  options: {
    validate: {
      payload: postPayloadSchema,
      failAction: async (request, h, error) => {
        const detail =
          error.details.find((e) => e.context.label === "whenTestingWasCarriedOut") ??
          error.details[0];
        return renderDateOfTestingError(request, h, {
          errorSummary: [{ text: detail.message, href: anchorTestingDate }],
          whenTestingWasCarriedOut: {
            value: request.payload.whenTestingWasCarriedOut,
            errorMessage: detail.message,
          },
        });
      },
    },
    handler: async (request, h) => {
      const sessionData = getSessionData(request, sessionEntryKeys.endemicsClaim);
      const { dateOfVisit } = sessionData;

      if (request.payload.whenTestingWasCarriedOut === "onAnotherDate") {
        const partsError = validateDateParts({
          day: request.payload[`${onAnotherDateInputId}-day`],
          month: request.payload[`${onAnotherDateInputId}-month`],
          year: request.payload[`${onAnotherDateInputId}-year`],
        });
        if (partsError) {
          return renderDateOfTestingError(request, h, buildDatePartsError(request, partsError));
        }
      }

      const dateOfTesting = resolveDateOfTesting(request, dateOfVisit);

      const samplingDateError = validateSamplingDate(request, dateOfTesting);
      if (samplingDateError) {
        return renderDateOfTestingError(request, h, samplingDateError);
      }

      if (!isWithin4MonthsBeforeOrAfterDateOfVisit(dateOfVisit, dateOfTesting)) {
        await sendInvalidDataEvent({
          request,
          sessionKey: sessionKeys.endemicsClaim.dateOfTesting,
          exception: `${dateOfTesting} is outside of the recommended 4 month period from the date of visit ${dateOfVisit}`,
          raisedDate: new Date(Date.now() - 1).toISOString(), // remove 1ms because chance of duplicate event issue given we don't show error page
        });
        // No error page returned, business requested that we don't block the claim
        // but instead report that samples older than 4 months
      }

      const isDateOfTestingBeforePreviousReview = checkForFollowUpBeforeReview(
        sessionData,
        dateOfTesting,
      );

      if (isDateOfTestingBeforePreviousReview) {
        return reviewBeforeFollowUpErrorHandler(request, dateOfTesting, h);
      }

      await setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.dateOfTesting,
        dateOfTesting,
      );

      if (isCattleFollowUp(sessionData)) {
        return h.redirect(claimRoutes.testUrn);
      }

      return h.redirect(claimRoutes.speciesNumbers);
    },
  },
};

function checkForFollowUpBeforeReview(
  {
    dateOfVisit,
    previousClaims,
    latestVetVisitApplication,
    typeOfLivestock,
    herdId,
    tempHerdId,
    typeOfReview,
  },
  dateOfTesting,
) {
  const previousReviewClaim = getReviewWithinLast10Months(
    dateOfVisit,
    previousClaims,
    latestVetVisitApplication,
    typeOfLivestock,
    getReviewHerdId({ herdId, tempHerdId }),
  );

  const isDateOfTestingBeforePreviousReview =
    typeOfReview === claimType.endemics &&
    previousReviewClaim &&
    new Date(dateOfTesting) < new Date(previousReviewClaim.data.dateOfVisit);
  return isDateOfTestingBeforePreviousReview;
}

async function reviewBeforeFollowUpErrorHandler(request, dateOfTesting, h) {
  const errorMessage =
    "You must do a review, including sampling, before you do the resulting follow-up.";

  await sendInvalidDataEvent({
    request,
    sessionKey: sessionKeys.endemicsClaim.dateOfTesting,
    exception: `Value ${dateOfTesting} is invalid. Error: ${errorMessage}`,
  });

  return h
    .view(claimViews.dateOfTestingException, {
      backLink: claimRoutes.dateOfTesting,
      errorMessage,
      errorLink:
        "https://www.gov.uk/guidance/farmers-how-to-apply-for-funding-to-improve-animal-health-and-welfare#timing-of-reviews-and-follow-ups",
    })
    .code(HttpStatus.BAD_REQUEST)
    .takeover();
}

function isCattleFollowUp({ dateOfVisit, typeOfLivestock, typeOfReview }) {
  const { isEndemicsFollowUp } = getReviewType(typeOfReview);
  const { isBeef, isDairy } = getLivestockTypes(typeOfLivestock);
  return (
    isVisitDateAfterPIHuntAndDairyGoLive(dateOfVisit) && isEndemicsFollowUp && (isBeef || isDairy)
  );
}

export const dateOfTestingHandlers = [getHandler, postHandler];

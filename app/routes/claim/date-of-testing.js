import Joi from "joi";
import { MAX_POSSIBLE_YEAR, MIN_POSSIBLE_YEAR } from "../../constants/claim-constants.js";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../session/index.js";
import { getReviewType, getLivestockTypes } from "../../lib/utils.js";
import {
  validateDateInputDay,
  validateDateInputMonth,
  validateDateInputYear,
  isValidDate,
} from "../../lib/date-validations.js";
import { getReviewWithinLast10Months } from "../../lib/claim-helper.js";
import {
  getReviewHerdId,
  isMultipleHerdsUserJourney,
  isVisitDateAfterPIHuntAndDairyGoLive,
  getHerdBackLink,
  isWithin4MonthsBeforeOrAfterDateOfVisit,
} from "../../lib/context-helper.js";
import HttpStatus from "http-status-codes";
import { claimRoutes, claimViews } from "../../constants/routes.js";
import { claimType } from "ffc-ahwr-common-library";
import { sendInvalidDataEvent } from "../../messaging/ineligibility-event-emission.js";

const addError = (error, label, type, href) => {
  if (
    error.details
      .filter((e) => e.context.label.startsWith(label))
      .filter((e) => e.type.indexOf(type) !== -1).length
  ) {
    error.details = error.details.filter(
      (e) => !e.context.label.startsWith(label) || e.type.indexOf(type) !== -1,
    );
  }
  if (error.details.filter((e) => e.context.label.startsWith(label)).length) {
    return {
      text: error.details.find((e) => e.context.label.startsWith(label)).message,
      href,
    };
  }
  return {};
};

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

const getHandler = {
  method: "GET",
  path: "/date-of-testing",
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

const postHandler = {
  method: "POST",
  path: "/date-of-testing",
  options: {
    validate: {
      payload: Joi.object({
        dateOfAgreementAccepted: Joi.string().required(),
        dateOfVisit: Joi.string().required(),
        whenTestingWasCarriedOut: Joi.string()
          .valid("whenTheVetVisitedTheFarmToCarryOutTheReview", "onAnotherDate")
          .required()
          .messages({
            "any.required": "Enter the date samples were taken",
          }),

        [`${onAnotherDateInputId}-day`]: Joi.when("whenTestingWasCarriedOut", {
          switch: [
            {
              is: "onAnotherDate",
              then: validateDateInputDay(onAnotherDateInputId, dateOfSamplingText).messages({
                "dateInputDay.ifNothingIsEntered": "Enter the date samples were taken",
              }),
            },
            {
              is: "whenTheVetVisitedTheFarmToCarryOutTheReview",
              then: Joi.allow(""),
            },
          ],
          otherwise: Joi.allow(""),
        }),

        [`${onAnotherDateInputId}-month`]: Joi.when("whenTestingWasCarriedOut", {
          switch: [
            {
              is: "onAnotherDate",
              then: validateDateInputMonth(onAnotherDateInputId, dateOfSamplingText),
            },
            {
              is: "whenTheVetVisitedTheFarmToCarryOutTheReview",
              then: Joi.allow(""),
            },
          ],
          otherwise: Joi.allow(""),
        }),

        [`${onAnotherDateInputId}-year`]: Joi.when("whenTestingWasCarriedOut", {
          switch: [
            {
              is: "onAnotherDate",
              then: validateDateInputYear(
                onAnotherDateInputId,
                dateOfSamplingText,
                (value, helpers) => {
                  if (value > MAX_POSSIBLE_YEAR || value < MIN_POSSIBLE_YEAR) {
                    // revisit this in the refactor date validation ticket
                    return value;
                  }

                  if (
                    value.whenTestingWasCarriedOut === "whenTheVetVisitedTheFarmToCarryOutTheReview"
                  ) {
                    return value;
                  }

                  if (
                    !isValidDate(
                      +helpers.state.ancestors[0][`${onAnotherDateInputId}-year`],
                      +helpers.state.ancestors[0][`${onAnotherDateInputId}-month`],
                      +helpers.state.ancestors[0][`${onAnotherDateInputId}-day`],
                    )
                  ) {
                    return value;
                  }

                  const dateOfTesting = new Date(
                    helpers.state.ancestors[0][`${onAnotherDateInputId}-year`],
                    helpers.state.ancestors[0][`${onAnotherDateInputId}-month`] - 1,
                    helpers.state.ancestors[0][`${onAnotherDateInputId}-day`],
                  );

                  const currentDate = new Date();
                  if (dateOfTesting > currentDate) {
                    return helpers.error("dateOfTesting.future");
                  }

                  const dateOfAgreementAccepted = new Date(
                    helpers.state.ancestors[0].dateOfAgreementAccepted,
                  );
                  if (dateOfTesting < dateOfAgreementAccepted) {
                    return helpers.error("dateOfTesting.beforeAgreementDate", {
                      dateOfAgreementAccepted: new Date(dateOfAgreementAccepted).toLocaleString(
                        "en-GB",
                        {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        },
                      ),
                    });
                  }

                  return value;
                },
                {
                  "dateOfTesting.future": "The date samples were taken must be in the past",
                  "dateOfTesting.beforeAgreementDate":
                    "The date samples were taken must be the same as or after the date of your agreement",
                },
              ),
            },
            {
              is: "whenTheVetVisitedTheFarmToCarryOutTheReview",
              then: Joi.allow(""),
            },
          ],
          otherwise: Joi.allow(""),
        }),
      }),
      failAction: async (request, h, error) => {
        const { dateOfVisit, typeOfReview, typeOfLivestock } = getSessionData(
          request,
          sessionEntryKeys.endemicsClaim,
        );
        const { questionText, questionHintText } = getTheQuestionAndHintText(
          typeOfReview,
          typeOfLivestock,
        );

        const errorSummary = [];
        if (error.details.find((e) => e.context.label === "whenTestingWasCarriedOut")) {
          errorSummary.push({
            text: error.details.find((e) => e.context.label === "whenTestingWasCarriedOut").message,
            href: "#whenTestingWasCarriedOut",
          });
        }

        const newError = addError(
          error,
          onAnotherDateInputId,
          "ifTheDateIsIncomplete",
          "#whenTestingWasCarriedOut",
        );
        if (Object.keys(newError).length > 0 && newError.constructor === Object) {
          errorSummary.push(newError);
        }

        const possibleErrorMessage = (labelStartsWith) =>
          error.details.find((e) => e.context.label.startsWith(labelStartsWith))?.message;

        return h
          .view(claimViews.dateOfTesting, {
            ...request.payload,
            dateOfVisit,
            errorSummary,
            questionText,
            questionHintText,
            optionSameReviewOrFollowUpDateText: optionSameReviewOrFollowUpDateText(typeOfReview),
            whenTestingWasCarriedOut: {
              value: request.payload.whenTestingWasCarriedOut,
              errorMessage: possibleErrorMessage("whenTestingWasCarriedOut"),
              onAnotherDate: {
                day: {
                  value: request.payload[`${onAnotherDateInputId}-day`],
                  error: error.details.find(
                    (e) =>
                      e.context.label === `${onAnotherDateInputId}-day` ||
                      e.type.startsWith("dateOfTesting"),
                  ),
                },
                month: {
                  value: request.payload[`${onAnotherDateInputId}-month`],
                  error: error.details.find(
                    (e) =>
                      e.context.label === `${onAnotherDateInputId}-month` ||
                      e.type.startsWith("dateOfTesting"),
                  ),
                },
                year: {
                  value: request.payload[`${onAnotherDateInputId}-year`],
                  error: error.details.find(
                    (e) =>
                      e.context.label === `${onAnotherDateInputId}-year` ||
                      e.type.startsWith("dateOfTesting"),
                  ),
                },
                errorMessage: possibleErrorMessage(onAnotherDateInputId),
              },
            },
            backLink: backLink(request),
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      },
    },
    handler: async (request, h) => {
      const {
        dateOfVisit,
        typeOfReview,
        typeOfLivestock,
        previousClaims,
        latestVetVisitApplication,
        herdId,
        tempHerdId,
      } = getSessionData(request, sessionEntryKeys.endemicsClaim);

      const { isEndemicsFollowUp } = getReviewType(typeOfReview);
      const { isBeef, isDairy } = getLivestockTypes(typeOfLivestock);

      const dateOfTesting = resolveDateOfTesting(request, dateOfVisit);

      if (!isWithin4MonthsBeforeOrAfterDateOfVisit(dateOfVisit, dateOfTesting)) {
        await sendInvalidDataEvent({
          request,
          sessionKey: sessionKeys.endemicsClaim.dateOfTesting,
          exception: `${dateOfTesting} is outside of the recommended 4 month period from the date of visit ${dateOfVisit}`,
        });
      }

      const previousReviewClaim = getReviewWithinLast10Months(
        dateOfVisit,
        previousClaims,
        latestVetVisitApplication,
        typeOfLivestock,
        getReviewHerdId({ herdId, tempHerdId }),
      );

      const isDateOfTestingBeforePreviousReview =
        previousReviewClaim &&
        new Date(dateOfTesting) < new Date(previousReviewClaim.data.dateOfVisit);

      if (typeOfReview === claimType.endemics && isDateOfTestingBeforePreviousReview) {
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

      await setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.dateOfTesting,
        dateOfTesting,
      );

      if (
        isVisitDateAfterPIHuntAndDairyGoLive(dateOfVisit) &&
        isEndemicsFollowUp &&
        (isBeef || isDairy)
      ) {
        return h.redirect(claimRoutes.testUrn);
      }

      return h.redirect(claimRoutes.speciesNumbers);
    },
  },
};

export const dateOfTestingHandlers = [getHandler, postHandler];

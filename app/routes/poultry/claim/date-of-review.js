import joi from "joi";
import { MAX_POSSIBLE_DAY, MAX_POSSIBLE_MONTH } from "../../../constants/claim-constants.js";
import { isValidDate } from "../../../lib/date-validations.js";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../../session/index.js";
import HttpStatus from "http-status-codes";
import {
  dashboardRoutes,
  poultryClaimRoutes,
  poultryClaimViews,
} from "../../../constants/routes.js";
import { sendInvalidDataEvent } from "../../../messaging/ineligibility-event-emission.js";
import { getSites } from "../../../api-requests/application-api.js";

const { poultryClaim: poultryClaimEntry } = sessionEntryKeys;
const {
  poultryClaim: {
    dateOfReview: dateOfReviewKey,
    latestPoultryApplication: latestPoultryApplicationKey,
  },
} = sessionKeys;

const buildErrorSummary = ({ errorMessage, href, inputsInError }) => {
  return {
    errorSummary: [
      {
        text: errorMessage,
        href,
      },
    ],
    inputsInError,
  };
};

const getHandler = {
  method: "GET",
  path: poultryClaimRoutes.dateOfReview,
  options: {
    handler: async (request, h) => {
      const { dateOfReview } = getSessionData(request, poultryClaimEntry);

      return h.view(poultryClaimViews.dateOfReview, {
        dateOfReview: {
          day: dateOfReview ? new Date(dateOfReview).getDate() : "",
          month: dateOfReview ? new Date(dateOfReview).getMonth() + 1 : "",
          year: dateOfReview ? new Date(dateOfReview).getFullYear() : "",
        },
        backLink: dashboardRoutes.poultryManageYourClaims,
      });
    },
  },
};

const reviewDateDayAnchor = "#review-date-day";

const payloadSchema = joi.object({
  crumb: joi.any(),
  "review-date-day": joi.number().min(1).max(MAX_POSSIBLE_DAY).required(),
  "review-date-month": joi.number().min(1).max(MAX_POSSIBLE_MONTH).required(),
  "review-date-year": joi.number().required(),
});

const getInputsInError = (error) => {
  const inputsInError = { day: false, month: false, year: false };
  const errorKeys = error?.details?.map(({ context }) => context.key) || [];

  if (errorKeys.includes("review-date-day")) {
    inputsInError.day = true;
  }
  if (errorKeys.includes("review-date-month")) {
    inputsInError.month = true;
  }
  if (errorKeys.includes("review-date-year")) {
    inputsInError.year = true;
  }

  return inputsInError;
};

const postHandler = {
  method: "POST",
  path: poultryClaimRoutes.dateOfReview,
  options: {
    validate: {
      payload: payloadSchema,
      failAction: async (request, h, error) => {
        const {
          "review-date-day": day,
          "review-date-month": month,
          "review-date-year": year,
        } = request.payload;
        const date = { day, month, year };
        const errorMessage = "Enter a date in the boxes below";
        const inputsInError = getInputsInError(error);

        await sendInvalidDataEvent({
          request,
          sessionKey: dateOfReviewKey,
          exception: errorMessage,
        });

        return h
          .view(poultryClaimViews.dateOfReview, {
            errorSummary: [{ text: errorMessage, href: reviewDateDayAnchor }],
            inputsInError,
            dateOfReview: {
              day: date.day || "",
              month: date.month || "",
              year: date.year || "",
              errorMessage: { text: errorMessage },
            },
            backLink: dashboardRoutes.poultryManageYourClaims,
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      },
    },
    handler: async (request, h) => {
      const {
        "review-date-day": day,
        "review-date-month": month,
        "review-date-year": year,
      } = request.payload;
      const date = { day, month, year };

      // Check if date is a valid calendar date (e.g., not Feb 30)
      if (!isValidDate(year, month, day)) {
        const validationError = buildErrorSummary({
          errorMessage: "The date of review must be a real date",
          href: reviewDateDayAnchor,
          inputsInError: { day: true, month: true, year: true },
        });
        return handleValidationError(request, validationError, h, date);
      }

      const dateOfReview = new Date(year, month - 1, day);

      const latestPoultryApplication = getSessionData(
        request,
        poultryClaimEntry,
        latestPoultryApplicationKey,
      );

      const applicationCreatedAt = new Date(latestPoultryApplication.createdAt);

      if (dateOfReview < applicationCreatedAt) {
        return handleTimingException(request, h, date, applicationCreatedAt);
      }

      setSessionData(request, poultryClaimEntry, dateOfReviewKey, dateOfReview);

      const { herds } = await getSites(latestPoultryApplication.reference, request.logger);

      if (herds.length) {
        return h.redirect(poultryClaimRoutes.selectTheSite);
      } else {
        return h.redirect(poultryClaimRoutes.enterSiteName);
      }
    },
  },
};

async function handleTimingException(request, h, date, agreementDate) {
  const formattedDate = agreementDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const errorMessage = `The date the biosecurity review happened must be on or after ${formattedDate}, the date your agreement started`;

  await sendInvalidDataEvent({
    request,
    sessionKey: dateOfReviewKey,
    exception: errorMessage,
  });

  return h
    .view(poultryClaimViews.dateOfReview, {
      errorSummary: [{ text: errorMessage, href: reviewDateDayAnchor }],
      inputsInError: { day: true, month: true, year: true },
      dateOfReview: {
        day: date.day,
        month: date.month,
        year: date.year,
        errorMessage: { text: errorMessage },
      },
      backLink: dashboardRoutes.poultryManageYourClaims,
    })
    .code(HttpStatus.BAD_REQUEST);
}

async function handleValidationError(request, validationError, h, date) {
  await sendInvalidDataEvent({
    request,
    sessionKey: dateOfReviewKey,
    exception: validationError.errorSummary[0].text,
  });

  return h
    .view(poultryClaimViews.dateOfReview, {
      ...validationError,
      dateOfReview: {
        day: date.day || "",
        month: date.month || "",
        year: date.year || "",
        errorMessage: { text: validationError.errorSummary[0].text },
      },
      backLink: dashboardRoutes.poultryManageYourClaims,
    })
    .code(HttpStatus.BAD_REQUEST);
}

export const poultryDateOfReviewHandlers = [getHandler, postHandler];

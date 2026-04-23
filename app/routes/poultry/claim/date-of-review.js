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
import { getSites } from "../../../api-requests/application-api.js";
import { trackEvent } from "../../../logging/logger.js";
import { sendInvalidDataPoultryEvent } from "../../../messaging/ineligibility-event-emission.js";
import { refreshApplications, resetPoultryClaimSession } from "../../../lib/context-helper.js";

const INVALID_DATE_OF_REVIEW_EVENT = "claim-invalid-date-of-review";

const { poultryClaim: poultryClaimEntry } = sessionEntryKeys;
const {
  poultryClaim: {
    dateOfReview: dateOfReviewKey,
    herds: herdsKey,
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
      const { journey } = request.query;
      if (journey === "new") {
        const organisation = getSessionData(request, sessionEntryKeys.organisation);
        const { latestPoultryApplication } = await refreshApplications(organisation.sbi, request);

        // reset the session as this is the entry point - if user goes all the way back
        // to this point to the date of review, we don't keep all their answers
        await resetPoultryClaimSession(request, latestPoultryApplication.reference);
      }

      const { dateOfReview: dateOfReviewRaw } = getSessionData(request, poultryClaimEntry);

      const dateOfReview = parseDateOfReview(dateOfReviewRaw);

      return h.view(poultryClaimViews.dateOfReview, {
        dateOfReview,
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
        request.logger.error({ error });
        const {
          "review-date-day": day,
          "review-date-month": month,
          "review-date-year": year,
        } = request.payload;
        const date = { day, month, year };
        const errorMessage = "Enter a date in the boxes below";
        const inputsInError = getInputsInError(error);

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

      if (!isValidDate(year, month, day)) {
        const validationError = buildErrorSummary({
          errorMessage: "The date of review must be a real date",
          href: reviewDateDayAnchor,
          inputsInError: { day: true, month: true, year: true },
        });
        return handleValidationError(request, validationError, h, date);
      }

      const dateOfReview = new Date(year, month - 1, day);

      if (dateIsInFuture(dateOfReview)) {
        const validationError = buildErrorSummary({
          errorMessage: "The date of review must be today or in the past",
          href: reviewDateDayAnchor,
          inputsInError: { day: true, month: true, year: true },
        });
        return handleValidationError(request, validationError, h, date);
      }

      const latestPoultryApplication = getSessionData(
        request,
        poultryClaimEntry,
        latestPoultryApplicationKey,
      );

      const applicationCreatedAt = new Date(latestPoultryApplication.createdAt);
      applicationCreatedAt.setHours(0, 0, 0, 0);

      if (dateOfReview < applicationCreatedAt) {
        const { reference: tempClaimReference } = getSessionData(request, poultryClaimEntry);
        return handleTimingException(request, h, date, applicationCreatedAt, tempClaimReference);
      }

      await setSessionData(request, poultryClaimEntry, dateOfReviewKey, dateOfReview);

      const { herds } = await getSites(latestPoultryApplication.reference, request.logger);

      await setSessionData(request, poultryClaimEntry, herdsKey, herds, {
        shouldEmitEvent: false,
      });

      if (herds.length) {
        return h.redirect(poultryClaimRoutes.selectTheSite);
      } else {
        return h.redirect(poultryClaimRoutes.enterSiteName);
      }
    },
  },
};

function dateIsInFuture(dateOfReview) {
  const now = new Date();

  return dateOfReview > now;
}

function parseDateOfReview(dateOfReviewRaw) {
  if (dateOfReviewRaw) {
    const dateOfReview = new Date(dateOfReviewRaw);
    return {
      day: dateOfReview.getDate(),
      month: dateOfReview.getMonth() + 1,
      year: dateOfReview.getFullYear(),
    };
  } else {
    return {
      day: "",
      month: "",
      year: "",
    };
  }
}

async function handleTimingException(request, h, date, agreementDate, tempClaimReference) {
  const formattedDate = agreementDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const errorMessage = `The date the biosecurity review happened must be on or after ${formattedDate}, the date your agreement started`;

  trackEvent(request.logger, INVALID_DATE_OF_REVIEW_EVENT, "review", {
    reference: tempClaimReference,
    kind: `dateEntered: ${date.year}-${date.month}-${date.day}, dateOfAgreement: ${formattedDate}`,
    reason: errorMessage,
  });

  await sendInvalidDataPoultryEvent({
    request,
    sessionKey: date,
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
  request.logger.error({ validationError });
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

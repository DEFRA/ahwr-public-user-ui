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

const INVALID_DATE_OF_VISIT_EVENT = "claim-invalid-date-of-visit";

const { poultryClaim: poultryClaimEntry } = sessionEntryKeys;
const {
  poultryClaim: {
    dateOfVisit: dateOfVisitKey,
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
  path: poultryClaimRoutes.dateOfVisit,
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

      const { dateOfVisit: dateOfVisitRaw } = getSessionData(request, poultryClaimEntry);

      const dateOfVisit = parseDateOfVisit(dateOfVisitRaw);

      return h.view(poultryClaimViews.dateOfVisit, {
        dateOfVisit,
        backLink: dashboardRoutes.poultryManageYourClaims,
      });
    },
  },
};

const visitDateDayAnchor = "#visit-date-day";

const payloadSchema = joi.object({
  crumb: joi.any(),
  "visit-date-day": joi.number().min(1).max(MAX_POSSIBLE_DAY).required(),
  "visit-date-month": joi.number().min(1).max(MAX_POSSIBLE_MONTH).required(),
  "visit-date-year": joi.number().required(),
});

const getInputsInError = (error) => {
  const inputsInError = { day: false, month: false, year: false };
  const errorKeys = error?.details?.map(({ context }) => context.key) || [];

  if (errorKeys.includes("visit-date-day")) {
    inputsInError.day = true;
  }
  if (errorKeys.includes("visit-date-month")) {
    inputsInError.month = true;
  }
  if (errorKeys.includes("visit-date-year")) {
    inputsInError.year = true;
  }

  return inputsInError;
};

const postHandler = {
  method: "POST",
  path: poultryClaimRoutes.dateOfVisit,
  options: {
    validate: {
      payload: payloadSchema,
      failAction: async (request, h, error) => {
        request.logger.error({ error });
        const {
          "visit-date-day": day,
          "visit-date-month": month,
          "visit-date-year": year,
        } = request.payload;
        const date = { day, month, year };
        const errorMessage = "Enter a date in the boxes below";
        const inputsInError = getInputsInError(error);

        return h
          .view(poultryClaimViews.dateOfVisit, {
            errorSummary: [{ text: errorMessage, href: visitDateDayAnchor }],
            inputsInError,
            dateOfVisit: {
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
        "visit-date-day": day,
        "visit-date-month": month,
        "visit-date-year": year,
      } = request.payload;
      const date = { day, month, year };

      if (!isValidDate(year, month, day)) {
        const validationError = buildErrorSummary({
          errorMessage: "The date of review must be a real date",
          href: visitDateDayAnchor,
          inputsInError: { day: true, month: true, year: true },
        });
        return handleValidationError(request, validationError, h, date);
      }

      const dateOfVisit = new Date(year, month - 1, day);

      if (dateIsInFuture(dateOfVisit)) {
        const validationError = buildErrorSummary({
          errorMessage: "The date of review must be today or in the past",
          href: visitDateDayAnchor,
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

      if (dateOfVisit < applicationCreatedAt) {
        const { reference: tempClaimReference } = getSessionData(request, poultryClaimEntry);
        return handleTimingException(request, h, date, applicationCreatedAt, tempClaimReference);
      }

      await setSessionData(request, poultryClaimEntry, dateOfVisitKey, dateOfVisit);

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

function dateIsInFuture(dateOfVisit) {
  const now = new Date();

  return dateOfVisit > now;
}

function parseDateOfVisit(dateOfVisitRaw) {
  if (dateOfVisitRaw) {
    const dateOfVisit = new Date(dateOfVisitRaw);
    return {
      day: dateOfVisit.getDate(),
      month: dateOfVisit.getMonth() + 1,
      year: dateOfVisit.getFullYear(),
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

  trackEvent(request.logger, INVALID_DATE_OF_VISIT_EVENT, "review", {
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
    .view(poultryClaimViews.dateOfVisit, {
      errorSummary: [{ text: errorMessage, href: visitDateDayAnchor }],
      inputsInError: { day: true, month: true, year: true },
      dateOfVisit: {
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
    .view(poultryClaimViews.dateOfVisit, {
      ...validationError,
      dateOfVisit: {
        day: date.day || "",
        month: date.month || "",
        year: date.year || "",
        errorMessage: { text: validationError.errorSummary[0].text },
      },
      backLink: dashboardRoutes.poultryManageYourClaims,
    })
    .code(HttpStatus.BAD_REQUEST);
}

export const poultryDateOfVisitHandlers = [getHandler, postHandler];

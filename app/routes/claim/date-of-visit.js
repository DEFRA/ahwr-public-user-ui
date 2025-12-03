import joi from "joi";
import {
  BEEF,
  DAIRY,
  MAX_POSSIBLE_DAY,
  MAX_POSSIBLE_MONTH,
  MULTIPLE_SPECIES_RELEASE_DATE,
  PI_HUNT_AND_DAIRY_FOLLOW_UP_RELEASE_DATE,
} from "../../constants/claim-constants.js";
import {
  getOldWorldClaimFromApplication,
  getAllClaimsForFirstHerd,
} from "../../lib/claim-helper.js";
import { isValidDate } from "../../lib/date-validations.js";
import { getReviewType, getLivestockTypes } from "../../lib/utils.js";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
  removeMultipleHerdsSessionData,
} from "../../session/index.js";
import { canMakeClaim } from "../../lib/can-make-claim.js";
import { isMultipleHerdsUserJourney } from "../../lib/context-helper.js";
import { getHerds } from "../../api-requests/application-api.js";
import { getTempHerdId } from "../../lib/get-temp-herd-id.js";
import { getNextMultipleHerdsPage } from "../../lib/get-next-multiple-herds-page.js";
import HttpStatus from "http-status-codes";
import { claimRoutes, claimViews } from "../../constants/routes.js";
import { claimType } from "ffc-ahwr-common-library";

const labelPrefix = "visit-date-";

const visitDateHtml = {
  inputErrorClass: "govuk-input--error",
  labelPrefix,
  labels: {
    day: `${labelPrefix}day`,
    month: `${labelPrefix}month`,
    year: `${labelPrefix}year`,
  },
};

const isMSClaimBeforeMSRelease = (previousClaims, typeOfLivestock, dateOfVisit) =>
  previousClaims?.some((claim) => claim.data.typeOfLivestock !== typeOfLivestock) &&
  dateOfVisit < MULTIPLE_SPECIES_RELEASE_DATE;

export const previousPageUrl = (
  latestVetVisitApplication,
  typeOfReview,
  previousClaims,
  typeOfLivestock,
) => {
  const relevantClaims = previousClaims.filter(
    (claim) => claim.data.typeOfLivestock === typeOfLivestock,
  );

  const oldWorldClaimTypeOfLivestock = latestVetVisitApplication?.data?.whichReview;

  const isCattleEndemicsClaimForOldWorldReview =
    typeOfReview === claimType.endemics &&
    [BEEF, DAIRY].includes(oldWorldClaimTypeOfLivestock) &&
    relevantClaims.length === 0 &&
    typeOfLivestock === oldWorldClaimTypeOfLivestock;

  if (isCattleEndemicsClaimForOldWorldReview) {
    return claimRoutes.vetVisitsReviewTestResults;
  }

  return claimRoutes.whichTypeOfReview;
};

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

const getInputErrors = (request, reviewOrFollowUpText, newWorldApplication) => {
  const dateSchema = joi
    .object({
      "visit-date-day": joi.number().max(MAX_POSSIBLE_DAY),
      "visit-date-month": joi.number().max(MAX_POSSIBLE_MONTH),
      "visit-date-year": joi.number(),
    })
    .options({ abortEarly: false }); // needed otherwise it doesn't check other fields if an error is found

  const { error } = dateSchema.validate(request.payload);

  const inputsInError = {
    day: false,
    month: false,
    year: false,
  };

  const inputKeysInError = error?.details?.map(({ context }) => context.key) || [];

  Object.keys(inputsInError).forEach((input) => {
    if (inputKeysInError.includes(`visit-date-${input}`)) {
      inputsInError[input] = true;
    }
  });

  if (inputKeysInError.length > 0) {
    const inputNameInError = inputKeysInError[0];
    return buildErrorSummary({
      errorMessage: `Enter the date of ${reviewOrFollowUpText}`,
      href: `#${inputNameInError}`,
      inputsInError,
    });
  }

  const [day, month, year] = Object.values(request.payload);
  const dateEnteredIsValid = isValidDate(Number(year), Number(month), Number(day));
  const visitDateDayHref = "#visit-date-day";

  if (!dateEnteredIsValid) {
    return buildErrorSummary({
      errorMessage: `The date of ${reviewOrFollowUpText} must be a real date`,
      href: visitDateDayHref,
      inputsInError: { day: true, month: true, year: true },
    });
  }

  const now = new Date();
  const dateOfVisit = new Date(year, month - 1, day);

  if (dateOfVisit > now) {
    return buildErrorSummary({
      errorMessage: `The date of ${reviewOrFollowUpText} must be today or in the past`,
      href: visitDateDayHref,
      inputsInError: { day: true, month: true, year: true },
    });
  }

  const applicationCreatedTime = new Date(newWorldApplication.createdAt).setHours(0, 0, 0, 0);

  if (applicationCreatedTime > dateOfVisit.getTime()) {
    return buildErrorSummary({
      errorMessage: `The date of ${reviewOrFollowUpText} must be the same as or after the date of your agreement`,
      href: visitDateDayHref,
      inputsInError: { day: true, month: true, year: true },
    });
  }

  return {
    errorSummary: [],
    inputsInError: { day: false, month: false, year: false },
  };
};

const getHandler = {
  method: "GET",
  path: "/date-of-visit",
  options: {
    handler: async (request, h) => {
      const {
        dateOfVisit,
        typeOfReview,
        latestVetVisitApplication: oldWorldApplication,
        previousClaims,
        typeOfLivestock,
      } = getSessionData(request, sessionEntryKeys.endemicsClaim);

      const { isReview } = getReviewType(typeOfReview);
      const reviewOrFollowUpText = isReview ? "review" : "follow-up";

      return h.view(claimViews.dateOfVisit, {
        reviewOrFollowUpText,
        dateOfVisit: {
          day: dateOfVisit ? new Date(dateOfVisit).getDate() : "",
          month: dateOfVisit ? new Date(dateOfVisit).getMonth() + 1 : "",
          year: dateOfVisit ? new Date(dateOfVisit).getFullYear() : "",
        },
        backLink: previousPageUrl(
          oldWorldApplication,
          typeOfReview,
          previousClaims,
          typeOfLivestock,
        ),
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: "/date-of-visit",
  options: {
    handler: async (request, h) => {
      const endemicsClaimSession = getSessionData(request, sessionEntryKeys.endemicsClaim);
      const organisation = getSessionData(request, sessionEntryKeys.organisation);
      const {
        typeOfReview: typeOfClaim,
        previousClaims,
        latestVetVisitApplication: oldWorldApplication,
        typeOfLivestock,
        // reference: tempClaimReference, // needed for the TODO event tracking
        latestEndemicsApplication: newWorldApplication,
        tempHerdId: tempHerdIdFromSession,
      } = endemicsClaimSession;

      const { isDairy } = getLivestockTypes(typeOfLivestock);
      const { isReview, isEndemicsFollowUp } = getReviewType(typeOfClaim);
      const reviewOrFollowUpText = isReview ? "review" : "follow-up";

      const { errorSummary, inputsInError } = getInputErrors(
        request,
        reviewOrFollowUpText,
        newWorldApplication,
      );

      if (errorSummary.length) {
        const data = {
          reviewOrFollowUpText,
          errorSummary,
          dateOfVisit: {
            day: request.payload[visitDateHtml.labels.day],
            month: request.payload[visitDateHtml.labels.month],
            year: request.payload[visitDateHtml.labels.year],
          },
          backLink: previousPageUrl(
            oldWorldApplication,
            typeOfClaim,
            previousClaims,
            typeOfLivestock,
          ),
          inputsInError,
        };

        // const readableApplicationCreatedDate = new Date(newWorldApplication.createdAt)
        //   .toLocaleDateString("en-GB")
        //   .split("/")
        //   .reverse()
        //   .join("-");

        // TODO - track event...
        // appInsights.defaultClient.trackEvent({
        //   name: "claim-invalid-date-of-visit",
        //   properties: {
        //     tempClaimReference,
        //     dateOfAgreement: readableApplicationCreatedDate,
        //     dateEntered: `${data.dateOfVisit.year}-${data.dateOfVisit.month}-${data.dateOfVisit.day}`,
        //     journeyType: reviewOrFollowUpText,
        //     error: errorSummary[0].text,
        //   },
        // });

        return h.view(claimViews.dateOfVisit, data).code(HttpStatus.BAD_REQUEST).takeover();
      }

      const dateOfVisit = new Date(
        request.payload[visitDateHtml.labels.year],
        request.payload[visitDateHtml.labels.month] - 1,
        request.payload[visitDateHtml.labels.day],
      );

      await setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.dateOfVisit,
        dateOfVisit,
      );

      const timingExceptionRedirect = checkForTimingException(h, {
        dateOfVisit,
        typeOfLivestock,
        previousClaims,
        isDairy,
        isEndemicsFollowUp,
      });

      if (timingExceptionRedirect) {
        return timingExceptionRedirect;
      }

      if (isMultipleHerdsUserJourney(dateOfVisit, newWorldApplication.flags)) {
        const tempHerdId = await getTempHerdId(request, tempHerdIdFromSession);
        await setSessionData(
          request,
          sessionEntryKeys.endemicsClaim,
          sessionKeys.endemicsClaim.tempHerdId,
          tempHerdId,
        );
        const { herds } = await getHerds(
          newWorldApplication.reference,
          typeOfLivestock,
          request.logger,
        );
        await setSessionData(
          request,
          sessionEntryKeys.endemicsClaim,
          sessionKeys.endemicsClaim.herds,
          herds,
        );

        if (herds.length) {
          return h.redirect(claimRoutes.selectTheHerd);
        }

        await setSessionData(
          request,
          sessionEntryKeys.endemicsClaim,
          sessionKeys.endemicsClaim.herdId,
          tempHerdId,
        );

        await setSessionData(
          request,
          sessionEntryKeys.endemicsClaim,
          sessionKeys.endemicsClaim.herdVersion,
          1,
        );

        return h.redirect(claimRoutes.enterHerdName);
      }

      return await nonMhRouting(request, h, {
        previousClaims,
        oldWorldApplication,
        typeOfLivestock,
        typeOfClaim,
        dateOfVisit,
        reviewOrFollowUpText,
        organisation,
      });
    },
  },
};

const checkForTimingException = (
  h,
  { dateOfVisit, typeOfLivestock, previousClaims, isDairy, isEndemicsFollowUp },
) => {
  let exception, exceptionView;

  const claimIsDairyAndIsFollowUpAndHappenedBeforePIReleased =
    isDairy && isEndemicsFollowUp && dateOfVisit < PI_HUNT_AND_DAIRY_FOLLOW_UP_RELEASE_DATE;

  if (claimIsDairyAndIsFollowUpAndHappenedBeforePIReleased) {
    exception = `User is attempting to claim for dairy follow-up with a date of visit of ${dateOfVisit} which is before dairy follow-ups was enabled.`;
    exceptionView = claimViews.dairyFollowUpDateException;
  }

  if (
    !claimIsDairyAndIsFollowUpAndHappenedBeforePIReleased &&
    isMSClaimBeforeMSRelease(previousClaims, typeOfLivestock, dateOfVisit)
  ) {
    exception = `User is attempting to claim for MS with a date of visit of ${dateOfVisit} which is before MS was enabled.`;
    exceptionView = claimViews.multipleSpeciesDateException;
  }

  if (exception) {
    // TODO - raise an invalid event here

    return h
      .view(exceptionView, { backLink: claimRoutes.dateOfVisit })
      .code(HttpStatus.BAD_REQUEST)
      .takeover();
  }

  return undefined;
};

const nonMhRouting = async (
  request,
  h,
  {
    previousClaims,
    oldWorldApplication,
    typeOfLivestock,
    typeOfClaim,
    dateOfVisit,
    reviewOrFollowUpText,
    organisation,
  },
) => {
  // all the below only applies when user rejects T&Cs or the visit date is pre-MH golive
  removeMultipleHerdsSessionData(request);

  const claimsForFirstHerdIfPreMH = getAllClaimsForFirstHerd(previousClaims, typeOfLivestock);

  // duplicated from which-type-of-review-ms
  // we don't know if postMH claims can be used for follow-up until date entered
  if (
    typeOfClaim === claimType.endemics &&
    !getOldWorldClaimFromApplication(oldWorldApplication, typeOfLivestock) &&
    claimsForFirstHerdIfPreMH.length === 0
  ) {
    // TODO - raise an invalid data event here

    return h
      .view(claimViews.whichTypeOfReviewException, {
        backLink: claimRoutes.whichTypeOfReview,
        backToPageMessage: "Tell us if you are claiming for a review or follow up.",
      })
      .code(HttpStatus.BAD_REQUEST)
      .takeover();
  }

  const errorMessage = canMakeClaim({
    prevClaims: claimsForFirstHerdIfPreMH,
    typeOfReview: typeOfClaim,
    dateOfVisit,
    organisation,
    typeOfLivestock,
    oldWorldApplication,
  });

  if (errorMessage) {
    // TODO - raise an invalid data event here

    return h
      .view(claimViews.dateOfVisitException, {
        backLink: claimRoutes.dateOfVisit,
        errorMessage,
        backToPageMessage: `Enter the date the vet last visited your farm for this ${reviewOrFollowUpText}.`,
      })
      .code(HttpStatus.BAD_REQUEST)
      .takeover();
  }

  return h.redirect(await getNextMultipleHerdsPage(request));
};

export const dateOfVisitHandlers = [getHandler, postHandler];

import { customerHasAtLeastOneValidCph } from "../../api-requests/rpa-api/cph-check.js";
import { requestAuthorizationCodeUrl } from "../../auth/auth-code-grant/request-authorization-code-url.js";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../session/index.js";
import { getRedirectPath } from "./get-redirect-path.js";
import { refreshApplications } from "../../lib/context-helper.js";
import { sendIneligibilityEvent } from "../../messaging/ineligibility-event-emission.js";
import { trackError } from "../../logging/logger.js";

export const setSessionForErrorPage = async ({
  request,
  error,
  hasMultipleBusinesses,
  backLink,
  organisation,
}) => {
  await setSessionData(
    request,
    sessionEntryKeys.cannotSignInDetails,
    sessionKeys.cannotSignInDetails.error,
    error,
  );
  await setSessionData(
    request,
    sessionEntryKeys.cannotSignInDetails,
    sessionKeys.cannotSignInDetails.hasMultipleBusinesses,
    hasMultipleBusinesses,
  );
  await setSessionData(
    request,
    sessionEntryKeys.cannotSignInDetails,
    sessionKeys.cannotSignInDetails.backLink,
    backLink,
  );
  await setSessionData(
    request,
    sessionEntryKeys.cannotSignInDetails,
    sessionKeys.cannotSignInDetails.organisation,
    organisation,
  );
};

const logReasonAndEmitEvent = ({ logger, reason, sbi, crn, personRole }) => {
  trackError(logger, new Error(reason), "signin-oidc-failed-login", reason, {
    reference: `sbi ${sbi}, crn ${crn}`,
    kind: personRole,
  });
};

export const checkLoginValid = async ({
  h,
  organisation,
  organisationPermission,
  request,
  cphNumbers,
  personSummary,
  personRole,
}) => {
  const { logger } = request;
  const { sbi } = organisation;
  const crn = getSessionData(request, sessionEntryKeys.customer, sessionKeys.customer.crn);

  if (organisation.locked) {
    logReasonAndEmitEvent({
      logger,
      reason: `Organisation id ${organisation.id} is locked by RPA`,
      sbi,
      crn,
      personRole,
    });
    return returnErrorRouting({ h, error: "LockedBusinessError", organisation, request, crn });
  }

  if (!organisationPermission) {
    logReasonAndEmitEvent({
      logger,
      reason: `Person id ${personSummary.id} does not have the required permissions for organisation id ${organisation.id}`,
      sbi,
      crn,
      personRole,
    });

    return returnErrorRouting({ h, error: "InvalidPermissionsError", organisation, request, crn });
  }

  const hasValidCph = customerHasAtLeastOneValidCph(cphNumbers);

  if (!hasValidCph) {
    logReasonAndEmitEvent({
      logger,
      reason: `Organisation id ${organisation.id} has no valid CPH's associated`,
      sbi,
      crn,
      personRole,
    });

    return returnErrorRouting({ h, error: "NoEligibleCphError", organisation, request, crn });
  }

  const { latestEndemicsApplication, latestVetVisitApplication } = await refreshApplications(
    sbi,
    request,
  );
  const applicationsForSbi = [latestEndemicsApplication, latestVetVisitApplication].filter(Boolean);

  if (applicationsForSbi.length && applicationsForSbi[0].redacted) {
    logReasonAndEmitEvent({
      logger,
      reason: `Agreement ${applicationsForSbi[0].reference} has been redacted`,
      sbi,
      crn,
      personRole,
    });

    return returnErrorRouting({ h, error: "AgreementRedactedError", organisation, request, crn });
  }

  const { redirectPath, error: err } = await getRedirectPath(applicationsForSbi, request);

  if (err) {
    logReasonAndEmitEvent({
      logger,
      reason: "User has an expired old world application",
      sbi,
      crn,
      personRole,
    });

    return returnErrorRouting({ h, error: err, organisation, request, crn });
  }

  return { redirectPath, redirectCallback: null };
};

const returnErrorRouting = async ({ h, error, organisation, request, crn }) => {
  await sendIneligibilityEvent({
    sessionId: request.yar.id,
    sbi: organisation.sbi,
    email: organisation.sbi,
    crn,
    exception: error,
  });

  const hasMultipleBusinesses = Boolean(
    getSessionData(
      request,
      sessionEntryKeys.customer,
      sessionKeys.customer.attachedToMultipleBusinesses,
    ),
  );

  await setSessionForErrorPage({
    request,
    error,
    hasMultipleBusinesses,
    backLink: await requestAuthorizationCodeUrl(request),
    organisation,
  });

  const redirectCallback = h.redirect("/cannot-sign-in").takeover();

  return { redirectPath: null, redirectCallback };
};

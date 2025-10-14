import { customerHasAtLeastOneValidCph } from "../../api-requests/rpa-api/cph-check.js";
import { requestAuthorizationCodeUrl } from "../../auth/auth-code-grant/request-authorization-code-url.js";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../session/index.js";
import { getApplicationsBySbi } from "../../api-requests/application-api.js";
import { getRedirectPath } from "./get-redirect-path.js";

export const setSessionForErrorPage = ({
  request,
  error,
  hasMultipleBusinesses,
  backLink,
  organisation,
}) => {
  setSessionData(
    request,
    sessionEntryKeys.cannotSignInDetails,
    sessionKeys.cannotSignInDetails.error,
    error,
  );
  setSessionData(
    request,
    sessionEntryKeys.cannotSignInDetails,
    sessionKeys.cannotSignInDetails.hasMultipleBusinesses,
    hasMultipleBusinesses,
  );
  setSessionData(
    request,
    sessionEntryKeys.cannotSignInDetails,
    sessionKeys.cannotSignInDetails.backLink,
    backLink,
  );
  setSessionData(
    request,
    sessionEntryKeys.cannotSignInDetails,
    sessionKeys.cannotSignInDetails.organisation,
    organisation,
  );
};

const logReasonAndEmitEvent = ({ logger, reason, sbi, crn }) => {
  logger.setBindings({ error: reason, crn });
  // TODO - track this exception
};

export const checkLoginValid = async ({
  h,
  organisation,
  organisationPermission,
  request,
  cphNumbers,
  personSummary,
}) => {
  const { logger } = request;
  const crn = getSessionData(request, sessionEntryKeys.customer, sessionKeys.customer.crn);

  if (organisation.locked) {
    logReasonAndEmitEvent({
      logger,
      reason: `Organisation id ${organisation.id} is locked by RPA`,
      sbi: organisation.sbi,
      crn,
    });
    return returnErrorRouting({ h, error: "LockedBusinessError", organisation, request, crn });
  }

  if (!organisationPermission) {
    logReasonAndEmitEvent({
      logger,
      reason: `Person id ${personSummary.id} does not have the required permissions for organisation id ${organisation.id}`,
      sbi: organisation.sbi,
      crn,
    });

    return returnErrorRouting({ h, error: "InvalidPermissionsError", organisation, request, crn });
  }

  const hasValidCph = customerHasAtLeastOneValidCph(cphNumbers);

  if (!hasValidCph) {
    logReasonAndEmitEvent({
      logger,
      reason: `Organisation id ${organisation.id} has no valid CPH's associated`,
      sbi: organisation.sbi,
      crn,
    });

    return returnErrorRouting({ h, error: "NoEligibleCphError", organisation, request, crn });
  }

  const applicationsForSbi = await getApplicationsBySbi(organisation.sbi, logger);

  if (applicationsForSbi.length && applicationsForSbi[0].redacted) {
    logger.setBindings({
      error: `Agreement ${applicationsForSbi[0].reference} has been redacted`,
      crn,
    });
    return returnErrorRouting({ h, error: "AgreementRedactedError", organisation, request, crn });
  }

  const { redirectPath, error: err } = getRedirectPath(applicationsForSbi, request);

  if (err) {
    logReasonAndEmitEvent({
      logger,
      reason: "User has an expired old world application",
      sbi: organisation.sbi,
      crn,
    });

    return returnErrorRouting({ h, error: err, organisation, request, crn });
  }

  return { redirectPath, redirectCallback: null };
};

const returnErrorRouting = async ({ h, error, organisation, request, crn }) => {
  // raise an ineligibility event here

  const hasMultipleBusinesses = Boolean(
    getSessionData(
      request,
      sessionEntryKeys.customer,
      sessionKeys.customer.attachedToMultipleBusinesses,
    ),
  );

  setSessionForErrorPage({
    request,
    error,
    hasMultipleBusinesses,
    backLink: requestAuthorizationCodeUrl(request),
    organisation,
  });

  const redirectCallback = h.redirect("/cannot-sign-in").takeover();

  return { redirectPath: null, redirectCallback };
};

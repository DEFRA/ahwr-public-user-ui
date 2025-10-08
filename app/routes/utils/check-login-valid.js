import { customerHasAtLeastOneValidCph } from "../../api-requests/rpa-api/cph-check.js";
import { requestAuthorizationCodeUrl } from "../../auth/auth-code-grant/request-authorization-code-url.js";
import { getCustomer, setCannotSignInDetails } from "../../session/index.js";
import { sessionKeys } from "../../session/keys.js";
import { getLatestApplicationsBySbi } from "../../api-requests/application-api.js";
import { getRedirectPath } from "./get-redirect-path.js";
import { maybeSuffixLoginRedirectUrl } from "../../lib/suffix-url.js";

export const setSessionForErrorPage = ({
  request,
  error,
  hasMultipleBusinesses,
  backLink,
  organisation,
}) => {
  setCannotSignInDetails(request, sessionKeys.cannotSignInDetails.error, error);
  setCannotSignInDetails(
    request,
    sessionKeys.cannotSignInDetails.hasMultipleBusinesses,
    hasMultipleBusinesses,
  );
  setCannotSignInDetails(request, sessionKeys.cannotSignInDetails.backLink, backLink);
  setCannotSignInDetails(request, sessionKeys.cannotSignInDetails.organisation, organisation);
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
  const crn = getCustomer(request, sessionKeys.customer.crn);

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

  const latestApplicationsForSbi = await getLatestApplicationsBySbi(organisation.sbi, logger);

  if (latestApplicationsForSbi[0]?.applicationRedacts?.length) {
    logger.setBindings({
      error: `Agreement ${latestApplicationsForSbi[0].reference} has been redacted`,
      crn,
    });
    return returnErrorRouting({ h, error: "AgreementRedactedError", organisation, request, crn });
  }

  const { redirectPath: initialRedirectPath, error: err } = getRedirectPath(
    latestApplicationsForSbi,
    request,
  );

  if (err) {
    logReasonAndEmitEvent({
      logger,
      reason: "User has an expired old world application",
      sbi: organisation.sbi,
      crn,
    });

    return returnErrorRouting({ h, error: err, organisation, request, crn });
  }

  const redirectPath = maybeSuffixLoginRedirectUrl(
    request,
    initialRedirectPath,
    crn,
    personSummary.id,
  );

  return { redirectPath, redirectCallback: null };
};

const returnErrorRouting = async ({ h, error, organisation, request, crn }) => {
  // raise an ineligibility event here

  const hasMultipleBusinesses = Boolean(
    getCustomer(request, sessionKeys.customer.attachedToMultipleBusinesses),
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

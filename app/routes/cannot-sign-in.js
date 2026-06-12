import { RPA_CONTACT_DETAILS } from "ffc-ahwr-common-library";
import { getSignOutUrl } from "./sign-out.js";
import {
  clearAllOfSession,
  getSessionData,
  sessionEntryKeys,
  sessionKeys,
  setSessionData,
} from "../session/index.js";
import { clearAuthCookie } from "../auth/cookie-auth/cookie-auth.js";
import { config } from "../config/index.js";
import { requestAuthorizationCodeUrl } from "../auth/auth-code-grant/request-authorization-code-url.js";
import { setSessionForErrorPage } from "./utils/check-login-valid.js";

export const cannotSignInExceptionHandlers = [
  {
    method: "GET",
    path: "/cannot-sign-in",
    options: {
      auth: false,
      plugins: {
        crumb: false,
      },
      handler: async (request, h) => {
        const cannotSignInDetails = getSessionData(request, sessionEntryKeys.cannotSignInDetails);

        const { error, hasMultipleBusinesses, organisation } = cannotSignInDetails || {};

        if (
          !cannotSignInDetails ||
          [error, hasMultipleBusinesses, organisation].includes(undefined)
        ) {
          throw new Error("Cannot render cannot sign in page as props are missing");
        }

        const token = getSessionData(
          request,
          sessionEntryKeys.tokens,
          sessionKeys.tokens.accessToken,
        );
        const signOutLink = getSignOutUrl(token);

        // log them out on our end, not defra id
        await clearAllOfSession(request);
        clearAuthCookie(request);

        // we need the backlink now, if hasMultipleBusinesses is true
        const backLink = hasMultipleBusinesses ? await requestAuthorizationCodeUrl(request) : null;
        // we need to re-set these values into session, in case user refreshes the page
        await setSessionForErrorPage({
          request,
          error,
          hasMultipleBusinesses,
          organisation,
        });
        await setSessionData(
          request,
          sessionEntryKeys.tokens,
          sessionKeys.tokens.accessToken,
          token,
        );

        return h.view("cannot-sign-in-exception", {
          error,
          ruralPaymentsAgency: RPA_CONTACT_DETAILS,
          hasMultipleBusinesses,
          backLink,
          sbiText: `SBI ${organisation.sbi ?? ""}`,
          organisationName: organisation.name,
          signOutLink,
          privacyPolicyUri: config.privacyPolicyUri,
        });
      },
    },
  },
];

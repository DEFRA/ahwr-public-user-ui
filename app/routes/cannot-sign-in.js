import { RPA_CONTACT_DETAILS } from "ffc-ahwr-common-library";
import { getSignOutUrl } from "./sign-out.js";
import {
  clearAllOfSession,
  getSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../session/index.js";
import { clearAuthCookie } from "../auth/cookie-auth/cookie-auth.js";
import { config } from "../config/index.js";

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

        const { error, backLink, hasMultipleBusinesses, organisation } = cannotSignInDetails || {};

        if (
          !cannotSignInDetails ||
          [error, hasMultipleBusinesses, backLink, organisation].includes(undefined)
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

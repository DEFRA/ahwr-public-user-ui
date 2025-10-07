import { RPA_CONTACT_DETAILS } from "ffc-ahwr-common-library";
import { getSignOutUrl } from "./sign-out.js";
import { clearAllOfSession, getCannotSignInDetails, getToken } from "../session/index.js";
import { sessionKeys } from "../session/keys.js";
import { clearAuthCookie } from "../auth/cookie-auth/cookie-auth.js";
import { claimServiceUri } from "../config/routes.js";
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
        const error = getCannotSignInDetails(request, sessionKeys.cannotSignInDetails.error);
        const backLink = getCannotSignInDetails(request, sessionKeys.cannotSignInDetails.backLink);
        const hasMultipleBusinesses = getCannotSignInDetails(
          request,
          sessionKeys.cannotSignInDetails.hasMultipleBusinesses,
        );
        const organisation = getCannotSignInDetails(
          request,
          sessionKeys.cannotSignInDetails.organisation,
        );

        if ([error, hasMultipleBusinesses, backLink, organisation].includes(undefined)) {
          return h.redirect(claimServiceUri);
        }

        const token = getToken(request, sessionKeys.tokens.accessToken);
        const signOutLink = getSignOutUrl(token);

        // log them out on our end, not defra id
        clearAllOfSession(request);
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

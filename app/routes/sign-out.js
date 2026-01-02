import {
  clearAllOfSession,
  getSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../session/index.js";
import { clearAuthCookie } from "../auth/cookie-auth/cookie-auth.js";
import { authConfig } from "../config/auth.js";
import { config } from "../config/index.js";
import { metricsCounter } from "../lib/metrics.js";

export const signOutUrl = `${authConfig.defraId.hostname}/${authConfig.defraId.policy}/oauth2/v2.0/logout`;

const signOutRedirectUrl = `${config.serviceUri}sign-in`;

export const getSignOutUrl = (token) => {
  const query = [`post_logout_redirect_uri=${signOutRedirectUrl}`, `id_token_hint=${token}`].join(
    "&",
  );

  return encodeURI(`${signOutUrl}?${query}`);
};

export const signOutHandlers = [
  {
    method: "GET",
    path: "/sign-out",
    options: {
      handler: async (request, h) => {
        const token = getSessionData(
          request,
          sessionEntryKeys.tokens,
          sessionKeys.tokens.accessToken,
        );
        clearAllOfSession(request);
        clearAuthCookie(request);
        await metricsCounter("sign_out");

        return h.redirect(getSignOutUrl(token));
      },
    },
  },
];

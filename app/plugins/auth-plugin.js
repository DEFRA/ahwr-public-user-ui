import { config } from "../config/index.js";
import { getLogger } from "../logging/logger.js";
import { getSessionData, sessionEntryKeys } from "../session/index.js";

const AUTH_COOKIE_PRESENT = "authCookiePresent";
const AUTH_COOKIE_VALIDATED = "authCookieValidated";

const hasAuthCookie = (request) => {
  const cookieHeader = request.headers.cookie;
  if (!cookieHeader) return false;
  return cookieHeader.includes(`${config.cookie.cookieNameAuth}=`);
};

export const authPlugin = {
  plugin: {
    name: "auth",
    register: async (server, _) => {
      server.ext("onRequest", (request, h) => {
        request.app[AUTH_COOKIE_PRESENT] = hasAuthCookie(request);
        return h.continue;
      });

      server.auth.strategy("session", "cookie", {
        cookie: {
          isSameSite: config.cookie.isSameSite,
          isSecure: config.cookie.isSecure,
          name: config.cookie.cookieNameAuth,
          password: config.cookie.password,
          path: config.cookiePolicy.path,
          ttl: config.cookie.ttl,
          clearInvalid: true,
          ignoreErrors: true,
        },
        keepAlive: true,
        redirectTo: (_request) => {
          return "/sign-in";
        },
        validateFunc: async (request) => {
          request.app[AUTH_COOKIE_VALIDATED] = true;
          const sessionWasSet = Boolean(getSessionData(request, sessionEntryKeys.organisation));

          if (!sessionWasSet) {
            getLogger().info(
              { path: request.path },
              "Auth validation failed: no organisation in session",
            );
          }

          return { valid: sessionWasSet };
        },
      });

      server.ext("onPreResponse", (request, h) => {
        const response = request.response;
        const statusCode = response.isBoom ? response.output.statusCode : response.statusCode;
        const location = response.isBoom
          ? response.output.headers?.location
          : response.headers?.location;
        const isRedirectToSignIn = statusCode === 302 && location === "/sign-in";

        if (
          isRedirectToSignIn &&
          request.app[AUTH_COOKIE_PRESENT] &&
          !request.app[AUTH_COOKIE_VALIDATED]
        ) {
          getLogger().info(
            { path: request.path },
            "Auth cookie invalid: decryption failed or cookie corrupted",
          );
        }

        return h.continue;
      });

      server.auth.default({ strategy: "session", mode: "required" });
    },
  },
};

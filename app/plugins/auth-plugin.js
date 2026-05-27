import { config } from "../config/index.js";
import { getLogger } from "../logging/logger.js";
import { getSessionData, sessionEntryKeys } from "../session/index.js";

export const authPlugin = {
  plugin: {
    name: "auth",
    register: async (server, _) => {
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
          const sessionWasSet = Boolean(getSessionData(request, sessionEntryKeys.organisation));

          if (!sessionWasSet) {
            getLogger().info(
              { path: request.path },
              "Auth cookie validation failed: no organisation in session",
            );
          }

          return { valid: sessionWasSet };
        },
      });
      server.auth.default({ strategy: "session", mode: "required" });
    },
  },
};

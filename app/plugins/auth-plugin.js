import { config } from "../config/index.js";
import { getSessionData, sessionEntryKeys, sessionKeys } from "../session/index.js";

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
        },
        keepAlive: true,
        redirectTo: (_request) => {
          return "/sign-in";
        },
        validateFunc: async (request) => {
          const sessionWasSet = Boolean(
            getSessionData(
              request,
              sessionEntryKeys.endemicsClaim,
              sessionKeys.endemicsClaim.organisation,
            ),
          );

          return { valid: sessionWasSet };
        },
      });
      server.auth.default({ strategy: "session", mode: "required" });
    },
  },
};

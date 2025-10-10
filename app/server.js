import { config } from "./config/index.js";
import Hapi from "@hapi/hapi";
import hapiCookiePlugin from "@hapi/cookie";
import hapiInertPlugin from "@hapi/inert";
import { authPlugin } from "./plugins/auth-plugin.js";
import { cookiePlugin } from "./plugins/cookies.js";
import { crumbPlugin } from "./plugins/crumb.js";
import { errorPagesPlugin } from "./plugins/error-pages.js";
import { loggingPlugin } from "./plugins/logger.js";
import { headerPlugin } from "./plugins/header.js";
import { sessionPlugin } from "./plugins/session.js";
import { viewContextPlugin } from "./plugins/view-context.js";
import { viewsPlugin } from "./plugins/views.js";
import { routerPlugin } from "./plugins/router.js";
import { devRedirectPlugin } from "./plugins/dev-redirect.js";
import { getCacheEngine } from "./cache/get-cache-engine.js";

export async function createServer() {
  const server = Hapi.server({
    cache: [getCacheEngine()],
    port: config.port,
    host: config.host,
    routes: {
      validate: {
        options: {
          abortEarly: false,
        },
      },
    },
    router: {
      stripTrailingSlash: true,
    },
  });

  await server.register(crumbPlugin);
  await server.register(hapiCookiePlugin);
  await server.register(hapiInertPlugin.plugin);
  await server.register(authPlugin);
  await server.register(cookiePlugin);
  await server.register(errorPagesPlugin);
  await server.register(loggingPlugin);
  await server.register(routerPlugin);
  await server.register(sessionPlugin);
  await server.register(viewContextPlugin);
  await server.register(viewsPlugin);
  await server.register(headerPlugin);

  if (config.devLogin.enabled) {
    await server.register(devRedirectPlugin);
  }

  return server;
}

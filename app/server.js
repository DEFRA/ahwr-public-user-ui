import { config } from "./config/index.js";
import Hapi from "@hapi/hapi";
import hapiCookiePlugin from "@hapi/cookie";
import hapiInertPlugin from "@hapi/inert";
import catboxRedis from "@hapi/catbox-redis";
import catboxMemory from "@hapi/catbox-memory";
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

const cacheConfig = config.useRedis ? config.cache.options : {};

const catbox = config.useRedis ? catboxRedis : catboxMemory;

export async function createServer() {
  const server = Hapi.server({
    cache: [
      {
        provider: {
          constructor: catbox,
          options: cacheConfig,
        },
      },
    ],
    port: config.port,
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

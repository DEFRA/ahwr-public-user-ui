import { config } from "./config/index.js";
import Hapi from "@hapi/hapi";
import hapiCookiePlugin from "@hapi/cookie";
import hapiInertPlugin from "@hapi/inert";
import { authPlugin } from "./plugins/auth-plugin.js";
import { cookiePlugin } from "./plugins/cookies.js";
import { crumbPlugin } from "./plugins/crumb.js";
import { errorPagesPlugin } from "./plugins/error-pages.js";
import { requestLogger } from "./logging/request-logger.js";
import Scooter from "@hapi/scooter";
import { headerPlugin } from "./plugins/header.js";
import { contentSecurityPolicyPlugin } from "./plugins/content-security-policy.js";
import { sessionPlugin } from "./plugins/session.js";
import { viewContextPlugin } from "./plugins/view-context.js";
import { viewsPlugin } from "./plugins/views.js";
import { routerPlugin } from "./plugins/router.js";
import { devRedirectPlugin } from "./plugins/dev-redirect.js";
import { getCacheEngine } from "./cache/get-cache-engine.js";
import { redirectAgreementRedactedPlugin } from "./plugins/redirect-agreement-redacted.js";
import { setupProxy } from "./lib/setup-proxy.js";
import { redirectAgreementNotAcceptedPlugin } from "./plugins/redirect-agreement-not-accepted.js";
import { redirectNoCheckDetailsPlugin } from "./plugins/redirect-no-check-details.js";
import { requestTracing } from "./lib/request-tracing.js";
import { loggingContextPlugin } from "./plugins/logging-context.js";
import { redirectPoultryAgreementNotAcceptedPlugin } from "./plugins/redirect-poultry-agreement-not-accepted.js";
import { redirectPoultryNoClaimReferencePlugin } from "./plugins/redirect-poultry-no-claim-reference.js";
import { redirectNoClaimReferencePlugin } from "./plugins/redirect-no-claim-reference.js";

export async function createServer() {
  setupProxy();
  const server = Hapi.server({
    cache: [getCacheEngine()],
    port: config.get("port"),
    host: config.get("host"),
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
  await server.register(requestLogger);
  await server.register(routerPlugin);
  await server.register(sessionPlugin);
  // Scooter and Blankie must precede viewContextPlugin so the CSP nonce exists when the view context reads it
  await server.register(Scooter);
  await server.register(contentSecurityPolicyPlugin);
  await server.register(viewContextPlugin);
  await server.register(viewsPlugin);
  await server.register(headerPlugin);
  await server.register(redirectNoCheckDetailsPlugin);
  await server.register(redirectAgreementNotAcceptedPlugin);
  await server.register(redirectNoClaimReferencePlugin);
  await server.register(redirectPoultryAgreementNotAcceptedPlugin);
  await server.register(redirectPoultryNoClaimReferencePlugin);
  await server.register(redirectAgreementRedactedPlugin);
  await server.register(requestTracing);
  await server.register(loggingContextPlugin);

  if (config.get("devLogin.enabled")) {
    await server.register(devRedirectPlugin);
  }

  server.ext("onRequest", (request, h) => {
    const context = {};

    const traceId = request.headers[config.get("tracing.header")];
    if (traceId) {
      context.trace = { id: traceId };
    }

    if (request.query && Object.keys(request.query).length) {
      context.url = {
        query: new URLSearchParams(request.query).toString(),
      };
    }

    if (Object.keys(context).length) {
      request.logger = request.logger.child(context);
    }

    return h.continue;
  });

  return server;
}

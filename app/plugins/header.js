import { randomBytes } from "node:crypto";
import { config } from "../config/index.js";

const NONCE_BYTE_LENGTH = 16;

const buildPolicy = ({ scriptSrc, styleSrc }) =>
  "default-src 'self';object-src 'none';" +
  scriptSrc +
  "form-action 'self';base-uri 'self';connect-src 'self' *.google-analytics.com *.analytics.google.com *.googletagmanager.com;" +
  styleSrc +
  "img-src 'self' *.google-analytics.com *.googletagmanager.com;frame-ancestors 'none';";

const getPermissiveSecurityPolicy = () =>
  buildPolicy({
    scriptSrc:
      "script-src 'self' www.google-analytics.com *.googletagmanager.com ajax.googleapis.com *.googletagmanager.com/gtm.js 'unsafe-inline' 'unsafe-eval';",
    styleSrc: "style-src 'self' 'unsafe-inline' tagmanager.google.com *.googleapis.com;",
  });

export const getHardenedSecurityPolicy = (nonce) =>
  buildPolicy({
    scriptSrc: `script-src 'self' www.google-analytics.com *.googletagmanager.com 'nonce-${nonce}';`,
    styleSrc: "style-src 'self' tagmanager.google.com *.googleapis.com;",
  });

const generateNonce = () => randomBytes(NONCE_BYTE_LENGTH).toString("base64");

export const headerPlugin = {
  plugin: {
    name: "header",
    register: (server, options) => {
      server.ext("onRequest", (request, h) => {
        request.app.cspNonce = generateNonce();
        return h.continue;
      });

      server.ext("onPreResponse", (request, h) => {
        const response = request.response;

        if (response.header) {
          options?.keys?.forEach((x) => {
            response.header(x.key, x.value);
          });

          if (config.csp.enforce) {
            response.header(
              "Content-Security-Policy",
              getHardenedSecurityPolicy(request.app.cspNonce),
            );
          } else {
            response.header("Content-Security-Policy", getPermissiveSecurityPolicy());
            response.header(
              "Content-Security-Policy-Report-Only",
              getHardenedSecurityPolicy(request.app.cspNonce),
            );
          }
        }

        return h.continue;
      });
    },
  },
  options: {
    keys: [
      { key: "X-Frame-Options", value: "deny" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Access-Control-Allow-Origin", value: config.serviceUri },
      { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      { key: "Cross-Origin-Embedder-Policy", value: "require-corp" },
      { key: "X-Robots-Tag", value: "noindex, nofollow" },
      { key: "Strict-Transport-Security", value: "max-age=31536000;" },
      { key: "Cache-Control", value: "no-store" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "Permissions-Policy", value: "Interest-Cohort=()" },
    ],
  },
};

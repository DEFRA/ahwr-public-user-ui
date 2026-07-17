import { randomBytes } from "node:crypto";
import { config } from "../config/index.js";

const NONCE_BYTE_LENGTH = 16;

export const getContentSecurityPolicy = (nonce) =>
  "default-src 'self';object-src 'none';" +
  `script-src 'self' www.google-analytics.com *.googletagmanager.com 'nonce-${nonce}';` +
  "form-action 'self';base-uri 'self';connect-src 'self' *.google-analytics.com *.analytics.google.com *.googletagmanager.com;" +
  "style-src 'self' tagmanager.google.com *.googleapis.com;" +
  "img-src 'self' *.google-analytics.com *.googletagmanager.com;frame-ancestors 'none';";

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

          response.header(
            "Content-Security-Policy",
            getContentSecurityPolicy(request.app.cspNonce),
          );
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
    ],
  },
};

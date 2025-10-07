import { config } from "../config/index.js";

const getSecurityPolicy = () =>
  "default-src 'self';" +
  "object-src 'none';" +
  "script-src 'self' www.google-analytics.com *.googletagmanager.com ajax.googleapis.com *.googletagmanager.com/gtm.js 'unsafe-inline' 'unsafe-eval' 'unsafe-hashes';" +
  "form-action 'self';" +
  "base-uri 'self';" +
  "connect-src 'self' *.google-analytics.com *.analytics.google.com *.googletagmanager.com" +
  "style-src 'self' 'unsafe-inline' tagmanager.google.com *.googleapis.com;" +
  "img-src 'self' *.google-analytics.com *.googletagmanager.com;";

export const headerPlugin = {
  plugin: {
    name: "header",
    register: (server, options) => {
      server.ext("onPreResponse", (request, h) => {
        const response = request.response;
        options?.keys?.forEach((x) => {
          response.header(x.key, x.value);
        });
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
      { key: "X-XSS-Protection", value: "1; mode=block" },
      { key: "Strict-Transport-Security", value: "max-age=31536000;" },
      { key: "Cache-Control", value: "no-cache" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "Permissions-Policy", value: "Interest-Cohort=()" },
      {
        key: "Content-Security-Policy",
        value: getSecurityPolicy(),
      },
    ],
  },
};

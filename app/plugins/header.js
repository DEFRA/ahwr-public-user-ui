import { config } from "../config/index.js";

export const headerPlugin = {
  plugin: {
    name: "header",
    register: (server, options) => {
      server.ext("onPreResponse", (request, h) => {
        const response = request.response;

        if (response.header) {
          options?.keys?.forEach((x) => {
            response.header(x.key, x.value);
          });
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

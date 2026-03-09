import { normalizeCphNumber } from "../lib/cph-normalization";

export const normalizeCphNumberPlugin = {
  plugin: {
    name: "normalize-cph-number",
    register: (server, _) => {
      server.ext("onPostAuth", (request, h) => {
        if (request.path === "/enter-cph-number" && request.method === "post") {
          request.payload.herdCph = normalizeCphNumber(request.payload.herdCph);
        }
        return h.continue;
      });
    },
  },
};

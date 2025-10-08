import { config } from "../config/index.js";
import crumb from "@hapi/crumb";

export const crumbPlugin = {
  plugin: crumb,
  options: {
    cookieOptions: {
      isSecure: config.cookie.isSecure,
    },
    skip: (request) => request.route.path === "/cookies" && request.method.toLowerCase() === "post", // Exclude from crumb token changes
  },
};

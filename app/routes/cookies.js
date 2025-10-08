import joi from "joi";
import { config } from "../config/index.js";
import { ViewModel } from "./models/cookies-policy.js";
import { updatePolicy } from "../cookies.js";

const {
  cookie: { cookieNameCookiePolicy },
} = config;

export const cookieHandlers = [
  {
    method: "GET",
    path: "/cookies",
    options: {
      auth: { mode: "try" },
      handler: async (request, h) => {
        return h.view(
          "cookies/cookie-policy",
          new ViewModel(request.state[cookieNameCookiePolicy], request.query.updated),
        );
      },
    },
  },
  {
    method: "POST",
    path: "/cookies",
    options: {
      auth: false,
      plugins: {
        crumb: false,
      },
      validate: {
        payload: joi.object({
          analytics: joi.boolean(),
          async: joi.boolean().default(false),
        }),
      },
      handler: (request, h) => {
        updatePolicy(request, h, request.payload.analytics);
        if (request.payload.async) {
          return h.response("ok");
        }
        return h.redirect("/cookies?updated=true");
      },
    },
  },
];

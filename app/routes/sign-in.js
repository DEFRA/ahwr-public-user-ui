import { requestAuthorizationCodeUrl } from "../auth/auth-code-grant/request-authorization-code-url.js";
import joi from "joi";
import { metricsCounter } from "../lib/metrics.js";
import { clearAllOfSession } from "../session/index.js";

export const defraIdSignInHandlers = [
  {
    method: "GET",
    path: "/sign-in",
    options: {
      auth: false,
      validate: {
        query: joi.object({
          ssoOrgId: joi.string().optional(),
        }),
      },
      handler: async (request, h) => {
        const { ssoOrgId } = request.query;
        await clearAllOfSession(request);
        const defraIdSignInUri = await requestAuthorizationCodeUrl(request, ssoOrgId);
        await metricsCounter("sign_in");
        return h.redirect(defraIdSignInUri);
      },
    },
  },
];

import { requestAuthorizationCodeUrl } from "../auth/auth-code-grant/request-authorization-code-url.js";
import joi from "joi";

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
        const defraIdSignInUri = requestAuthorizationCodeUrl(request, ssoOrgId);

        return h.redirect(defraIdSignInUri);
      },
    },
  },
];

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
          relationshipId: joi.string().optional(),
        }),
      },
      handler: async (request, h) => {
        const { relationshipId } = request.query;
        const defraIdSignInUri = requestAuthorizationCodeUrl(request, relationshipId);

        return h.redirect(defraIdSignInUri);
      },
    },
  },
];

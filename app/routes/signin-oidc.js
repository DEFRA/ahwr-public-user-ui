import joi from "joi";
import { StatusCodes } from "http-status-codes";
import { sessionKeys } from "../session/keys.js";
import { requestAuthorizationCodeUrl } from "../auth/auth-code-grant/request-authorization-code-url.js";
import { generateNewCrumb } from "./utils/crumb-cache.js";
import { retrieveApimAccessToken } from "../auth/client-credential-grant/retrieve-apim-access-token.js";
import { clearAllOfSession, getCustomer } from "../session/index.js";
import { authenticate } from "../auth/authenticate.js";
import { clearAuthCookie, setAuthCookie } from "../auth/cookie-auth/cookie-auth.js";
import { farmerApply } from "../constants/constants.js";
import { updateContactHistory } from "../api-requests/contact-history-api.js";
import { RPA_CONTACT_DETAILS } from "ffc-ahwr-common-library";
import { checkLoginValid } from "./utils/check-login-valid.js";
import { getPersonAndOrg } from "../api-requests/rpa-api/get-person-and-org.js";

export const signinRouteHandlers = [
  {
    method: "GET",
    path: "/signin-oidc",
    options: {
      auth: false,
      validate: {
        query: joi
          .object({
            code: joi.string().required(),
            state: joi.string().required(),
          })
          .options({
            stripUnknown: true,
          }),
        failAction(request, h, err) {
          request.logger.setBindings({ err });
          // TODO - track this exception

          return h
            .view("verify-login-failed", {
              backLink: requestAuthorizationCodeUrl(request),
              ruralPaymentsAgency: RPA_CONTACT_DETAILS,
            })
            .code(StatusCodes.BAD_REQUEST)
            .takeover();
        },
      },
      handler: async (request, h) => {
        try {
          const { logger } = request;
          await generateNewCrumb(request, h);

          const { accessToken, authRedirectCallback } = await authenticate(request, h, logger);

          if (authRedirectCallback) {
            return authRedirectCallback;
          }

          const apimAccessToken = await retrieveApimAccessToken(request);

          const crn = getCustomer(request, sessionKeys.customer.crn);

          const { orgDetails, personSummary, cphNumbers } = await getPersonAndOrg({
            request,
            apimAccessToken,
            crn,
            logger,
            accessToken,
          });

          await updateContactHistory(personSummary, orgDetails.organisation, logger);

          setAuthCookie(request, personSummary.email, farmerApply);

          const { redirectPath, redirectCallback } = await checkLoginValid({
            h,
            organisation: orgDetails.organisation,
            organisationPermission: orgDetails.organisationPermission,
            request,
            cphNumbers,
            personSummary,
          });

          if (redirectCallback) {
            return redirectCallback;
          }

          // TODO - track this event

          return h.redirect(redirectPath);
        } catch (err) {
          request.logger.setBindings({ err });
          // TODO - track this exception

          clearAllOfSession(request);
          clearAuthCookie(request);

          return h
            .view("verify-login-failed", {
              backLink: requestAuthorizationCodeUrl(request),
              ruralPaymentsAgency: RPA_CONTACT_DETAILS,
            })
            .code(StatusCodes.INTERNAL_SERVER_ERROR)
            .takeover();
        }
      },
    },
  },
];

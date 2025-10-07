import { verifyState } from "./auth-code-grant/state.js";
import { verify as verifyNonce } from "./id-token/nonce.js";
import { jwtVerify } from "./token-verify/jwt-verify.js";
import { jwtVerifyIss } from "./token-verify/jwt-verify-iss.js";
import { redeemAuthorizationCodeForAccessToken } from "./auth-code-grant/redeem-authorization-code-for-access-token.js";
import { setCustomer, setToken } from "../session/index.js";
import { sessionKeys } from "../session/keys.js";
import { requestAuthorizationCodeUrl } from "./auth-code-grant/request-authorization-code-url.js";
import { acquireSigningKey } from "./token-verify/acquire-signing-key.js";

export const authenticate = async (request, h, logger) => {
  if (!verifyState(request)) {
    logger.setBindings({
      error: "Invalid state. Redirecting back to /signin-oidc after resetting state.",
    });
    const authRedirectCallback = h.redirect(requestAuthorizationCodeUrl(request));

    return { authRedirectCallback };
  }
  const redeemResponse = await redeemAuthorizationCodeForAccessToken(request);
  const signingKey = await acquireSigningKey();
  const accessToken = await jwtVerify(redeemResponse.access_token, signingKey);
  const idToken = await jwtVerify(redeemResponse.id_token, signingKey);

  await jwtVerifyIss(accessToken.iss);
  verifyNonce(request, idToken);

  setToken(request, sessionKeys.tokens.accessToken, redeemResponse.access_token);

  setCustomer(request, sessionKeys.customer.crn, accessToken.contactId);
  setCustomer(request, sessionKeys.customer.organisationId, accessToken.currentRelationshipId);
  setCustomer(
    request,
    sessionKeys.customer.attachedToMultipleBusinesses,
    accessToken.enrolmentCount > 1,
  );

  return { accessToken };
};

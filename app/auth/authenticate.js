import { verifyState } from "./auth-code-grant/state.js";
import { verify as verifyNonce } from "./id-token/nonce.js";
import { jwtVerify } from "./token-verify/jwt-verify.js";
import { jwtVerifyIss } from "./token-verify/jwt-verify-iss.js";
import { redeemAuthorizationCodeForAccessToken } from "./auth-code-grant/redeem-authorization-code-for-access-token.js";
import { setSessionData, sessionEntryKeys, sessionKeys } from "../session/index.js";
import { requestAuthorizationCodeUrl } from "./auth-code-grant/request-authorization-code-url.js";
import { acquireSigningKey } from "./token-verify/acquire-signing-key.js";

export const authenticate = async (request, h, logger) => {
  if (!verifyState(request)) {
    logger.setBindings({
      error: "Invalid state. Redirecting back to /signin-oidc after resetting state.",
    });
    const authRedirectCallback = h.redirect(await requestAuthorizationCodeUrl(request));

    return { authRedirectCallback };
  }
  const redeemResponse = await redeemAuthorizationCodeForAccessToken(request);
  const signingKey = await acquireSigningKey();
  const accessToken = await jwtVerify(redeemResponse.access_token, signingKey);
  const idToken = await jwtVerify(redeemResponse.id_token, signingKey);

  await jwtVerifyIss(accessToken.iss);
  verifyNonce(request, idToken);

  await setSessionData(
    request,
    sessionEntryKeys.tokens,
    sessionKeys.tokens.accessToken,
    redeemResponse.access_token,
  );

  await setSessionData(
    request,
    sessionEntryKeys.customer,
    sessionKeys.customer.crn,
    accessToken.contactId,
  );
  await setSessionData(
    request,
    sessionEntryKeys.customer,
    sessionKeys.customer.organisationId,
    accessToken.currentRelationshipId,
  );
  await setSessionData(
    request,
    sessionEntryKeys.customer,
    sessionKeys.customer.attachedToMultipleBusinesses,
    accessToken.enrolmentCount > 1,
  );

  return { accessToken };
};

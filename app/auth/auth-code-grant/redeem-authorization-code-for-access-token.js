import Wreck from "@hapi/wreck";
import FormData from "form-data";
import { authConfig } from "../../config/auth.js";
import { getSessionData, sessionEntryKeys, sessionKeys } from "../../session/index.js";

export const redeemAuthorizationCodeForAccessToken = async (request) => {
  const endpoint = `${authConfig.defraId.hostname}/${authConfig.defraId.policy}/oauth2/v2.0/token`;
  try {
    const data = new FormData();
    // The Application (client) ID
    data.append("client_id", authConfig.defraId.clientId);
    data.append("client_secret", authConfig.defraId.clientSecret);
    // Allow apps to declare the resource they want the token for during token redemption.
    data.append("scope", authConfig.defraId.scope);
    // The authorization_code that you acquired in the first leg of the flow.
    data.append("code", request.query.code);
    // Must be authorization_code for the authorization code flow.
    data.append("grant_type", "authorization_code");
    // The same redirect_uri value that was used to acquire the authorization_code.
    data.append("redirect_uri", authConfig.defraId.redirectUri);
    // The same code_verifier that was used to obtain the authorization_code.
    const pkcecodes = getSessionData(
      request,
      sessionEntryKeys.pkcecodes,
      sessionKeys.pkcecodes.verifier,
    );
    data.append("code_verifier", pkcecodes);
    const { payload } = await Wreck.post(endpoint, {
      headers: data.getHeaders(),
      payload: data,
      json: true,
    });
    return payload;
  } catch (error) {
    request.logger.error({ error, endpoint });
    throw error;
  }
};

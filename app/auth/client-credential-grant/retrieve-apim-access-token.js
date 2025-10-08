import Wreck from "@hapi/wreck";
import { config } from "../../config/index.js";
import { authConfig } from "../../config/auth.js";
import FormData from "form-data";

let tokenCache = {
  accessToken: null,
  expiresAt: 0, // seconds
};

const apimTokenEndpoint = `${authConfig.apim.hostname}${authConfig.apim.oAuthPath}`;

function isTokenValid(buffer = 60) {
  if (!tokenCache.accessToken) {
    return false;
  }
  const now = Date.now();
  const bufferSeconds = buffer * 1000;

  return now < tokenCache.expiresAt - bufferSeconds;
}

async function fetchNewToken() {
  const data = new FormData();
  data.append("client_id", String(authConfig.apim.clientId));
  data.append("client_secret", String(authConfig.apim.clientSecret));
  data.append("scope", String(authConfig.apim.scope));
  data.append("grant_type", "client_credentials");

  const { payload } = await Wreck.post(apimTokenEndpoint, {
    headers: data.getHeaders(),
    payload: data,
    json: true,
    timeout: config.wreckHttp.timeoutMilliseconds,
  });

  const defaultExpirySeconds = 3600;
  const expiresInSec = Number(payload?.expires_in) || defaultExpirySeconds;
  const issuedAt = Date.now();

  tokenCache = {
    accessToken: `${payload.token_type} ${payload.access_token}`,
    expiresAt: issuedAt + expiresInSec * 1000,
  };

  return tokenCache;
}

export async function retrieveApimAccessToken(request) {
  if (isTokenValid()) {
    return tokenCache.accessToken;
  }

  try {
    await fetchNewToken();
  } catch (err) {
    request.logger.setBindings({
      err,
      apimTokenEndpoint,
    });
    throw err;
  }

  return tokenCache.accessToken;
}

export function invalidateApimAccessToken() {
  tokenCache = { tokenType: null, accessToken: null, expiresAt: 0 };
}

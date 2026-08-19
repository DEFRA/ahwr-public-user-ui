import { authConfig } from "../../config/auth.js";
import { generate as generateNonce } from "../id-token/nonce.js";
import { generate as generateState } from "./state.js";
import { generateCodeChallenge } from "./proof-key-for-code-exchange.js";

export const DEFRA_ID_BASE_URL = `${authConfig.get("defraId.hostname")}${authConfig.get("defraId.oAuthAuthorisePath")}`;

export const requestAuthorizationCodeUrl = async (request, ssoOrgId) => {
  const url = new URL(DEFRA_ID_BASE_URL);

  url.searchParams.append("p", authConfig.get("defraId.policy"));
  url.searchParams.append("client_id", authConfig.get("defraId.clientId"));
  url.searchParams.append("nonce", await generateNonce(request));
  url.searchParams.append("redirect_uri", authConfig.get("defraId.redirectUri"));
  url.searchParams.append("scope", authConfig.get("defraId.scope"));
  url.searchParams.append("response_type", "code");
  url.searchParams.append("serviceId", authConfig.get("defraId.serviceId"));
  url.searchParams.append("state", await generateState(request));
  url.searchParams.append("forceReselection", true);

  if (ssoOrgId) {
    url.searchParams.append("relationshipId", ssoOrgId);
  }

  // Used to secure authorization code grants by using Proof Key for Code Exchange (PKCE)
  const codeChallenge = await generateCodeChallenge(request);
  url.searchParams.append("code_challenge", codeChallenge);
  url.searchParams.append("code_challenge_method", "S256");

  return url.toString();
};

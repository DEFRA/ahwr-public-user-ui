import { config } from "../config/index.js";
import { getFarmerApplyData } from "../session/index.js";
import { base64URLEncode } from "../auth/auth-code-grant/proof-key-for-code-exchange.js";
import { sessionKeys } from "../session/keys.js";

export function maybeSuffixLoginRedirectUrl(request, redirectPath, crn, customerId) {
  if (config.isDev && getFarmerApplyData(request, "sendBackDevValue") === "true") {
    return `${redirectPath}?org=${base64URLEncode(Buffer.from(JSON.stringify(getFarmerApplyData(request, sessionKeys.endemicsClaim.organisation))))}&crn=${crn}&custId=${customerId}`;
  }

  return redirectPath;
}

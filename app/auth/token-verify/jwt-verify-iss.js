import { authConfig } from "../../config/auth.js";

const jwtTrustedIssuers = new Set([
  `https://${authConfig.defraId.tenantName}.b2clogin.com/${authConfig.defraId.jwtIssuerId}/v2.0/`,
]);

export const jwtVerifyIss = async (iss) => {
  if (!jwtTrustedIssuers.has(iss)) {
    throw new Error(`Issuer not trusted: ${iss}`);
  }

  return true;
};

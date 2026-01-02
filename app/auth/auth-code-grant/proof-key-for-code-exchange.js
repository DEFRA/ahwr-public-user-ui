import crypto from "node:crypto";
import { setSessionData, sessionEntryKeys, sessionKeys } from "../../session/index.js";

export const base64URLEncode = (str) =>
  str.toString("base64").replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");

const sha256 = (buffer) => {
  return crypto.createHash("sha256").update(buffer).digest();
};

export const generateCodeChallenge = async (request) => {
  const verifier = base64URLEncode(crypto.randomBytes(32));
  const codeChallenge = base64URLEncode(sha256(verifier));
  await setSessionData(
    request,
    sessionEntryKeys.pkcecodes,
    sessionKeys.pkcecodes.verifier,
    verifier,
  );
  return codeChallenge;
};

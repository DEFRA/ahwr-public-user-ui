import { randomUUID } from "node:crypto";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../session/index.js";

export const generate = async (request) => {
  const nonce = randomUUID();
  await setSessionData(request, sessionEntryKeys.tokens, sessionKeys.tokens.nonce, nonce);
  return nonce;
};

export const verify = (request, idToken) => {
  if (typeof idToken === "undefined") {
    throw new Error("Empty id_token");
  }
  const nonce = getSessionData(request, sessionEntryKeys.tokens, sessionKeys.tokens.nonce);
  if (!nonce) {
    throw new Error("HTTP Session contains no nonce");
  }
  if (nonce !== idToken.nonce) {
    throw new Error("Nonce mismatch");
  }
};

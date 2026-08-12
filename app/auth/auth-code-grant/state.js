import { randomUUID } from "node:crypto";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../session/index.js";
import { config } from "../../config/index.js";

export const generate = async (request) => {
  const state = {
    id: randomUUID(),
    namespace: config.namespace,
  };

  const base64EncodedState = Buffer.from(JSON.stringify(state)).toString("base64");
  await setSessionData(
    request,
    sessionEntryKeys.tokens,
    sessionKeys.tokens.state,
    base64EncodedState,
  );
  return base64EncodedState;
};

export const verifyState = (request) => {
  const { state } = request.query;
  if (!state) {
    throw new Error("No state");
  }

  const decodedState = JSON.parse(Buffer.from(state, "base64").toString("ascii"));
  const sessionState = getSessionData(request, sessionEntryKeys.tokens, sessionKeys.tokens.state);

  if (sessionState === undefined) {
    throw new Error("No session state");
  }

  const savedState = JSON.parse(Buffer.from(sessionState, "base64").toString("ascii"));

  if (decodedState.id !== savedState.id) {
    throw new Error("State id does not match");
  }

  return true;
};

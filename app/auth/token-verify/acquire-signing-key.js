import Wreck from "@hapi/wreck";
import { authConfig } from "../../config/auth.js";
import { API_CALL_FAILED_CATEGORY, trackError, getLogger } from "../../logging/logger.js";

let cachedKey = null;

export const acquireSigningKey = async () => {
  if (cachedKey) {
    return cachedKey;
  }

  const endpoint = `${authConfig.defraId.hostname}/discovery/v2.0/keys?p=${authConfig.defraId.policy}`;

  try {
    const { payload } = await Wreck.get(endpoint, { json: true });

    cachedKey = payload.keys[0];
    return cachedKey;
  } catch (error) {
    trackError(getLogger(), error, API_CALL_FAILED_CATEGORY, "Failed to acquire signing key", {
      kind: endpoint,
    });
    throw error;
  }
};

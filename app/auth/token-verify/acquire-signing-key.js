import Wreck from "@hapi/wreck";
import { authConfig } from "../../config/auth.js";

let cachedKey = null;

export const acquireSigningKey = async () => {
  if (cachedKey) {
    return cachedKey;
  }

  const { payload } = await Wreck.get(
    `${authConfig.defraId.hostname}/discovery/v2.0/keys?p=${authConfig.defraId.policy}`,
    { json: true },
  );

  cachedKey = payload.keys[0];
  return cachedKey;
};

import Wreck from "@hapi/wreck";
import { config } from "../config/index.js";
import { API_CALL_FAILED_CATEGORY, trackError } from "../logging/logger.js";

const { apiKeys } = config;
export async function getClaimsByApplicationReference(applicationReference, logger) {
  const endpoint = `${config.applicationApiUri}/applications/${applicationReference}/claims`;
  try {
    const { payload } = await Wreck.get(endpoint, {
      json: true,
      headers: { "x-api-key": apiKeys.publicUiBackendApiKey },
    });

    return payload;
  } catch (error) {
    trackError(
      logger,
      error,
      API_CALL_FAILED_CATEGORY,
      "Failed to get claims by application reference",
      {
        kind: endpoint,
      },
    );
    throw error;
  }
}

export async function submitNewClaim(data, logger) {
  const endpoint = `${config.applicationApiUri}/claims`;

  try {
    const { payload } = await Wreck.post(endpoint, {
      payload: data,
      json: true,
      headers: { "x-api-key": process.env.BACKEND_API_KEY },
    });

    return payload;
  } catch (error) {
    trackError(logger, error, API_CALL_FAILED_CATEGORY, "Failed to get submit new claim", {
      kind: endpoint,
    });
    throw error;
  }
}

export async function isURNUnique(data, logger) {
  const endpoint = `${config.applicationApiUri}/claims/is-urn-unique`;
  try {
    const { payload } = await Wreck.post(endpoint, {
      payload: data,
      json: true,
      headers: { "x-api-key": apiKeys.publicUiBackendApiKey },
    });

    return payload;
  } catch (error) {
    trackError(logger, error, API_CALL_FAILED_CATEGORY, "Failed to check Unique URN", {
      kind: endpoint,
    });
    throw error;
  }
}

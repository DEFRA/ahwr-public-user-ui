import Wreck from "@hapi/wreck";
import { config } from "../config/index.js";
import { API_CALL_FAILED_CATEGORY, trackError } from "../logging/logger.js";

export async function getClaimsByApplicationReference(applicationReference, logger) {
  const endpoint = `${config.applicationApiUri}/applications/${applicationReference}/claims`;
  try {
    const { payload } = await Wreck.get(endpoint, { json: true });

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
    });

    return payload;
  } catch (error) {
    trackError(logger, error, API_CALL_FAILED_CATEGORY, "Failed to check Unique URN", {
      kind: endpoint,
    });
    throw error;
  }
}

import Wreck from "@hapi/wreck";
import { config } from "../config/index.js";

export async function getClaimsByApplicationReference(applicationReference, logger) {
  const endpoint = `${config.applicationApiUri}/applications/${applicationReference}/claims`;
  try {
    const { payload } = await Wreck.get(endpoint, { json: true });

    return payload;
  } catch (error) {
    logger.error({ error });
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
    logger.error({ error });
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
    logger.error({ error });
    throw error;
  }
}

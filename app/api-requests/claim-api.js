import Wreck from "@hapi/wreck";
import { config } from "../config/index.js";

export async function getClaimsByApplicationReference(applicationReference, logger) {
  const endpoint = `${config.applicationApiUri}/applications/${applicationReference}/claims`;
  try {
    const { payload } = await Wreck.get(endpoint, { json: true });

    return payload;
  } catch (err) {
    logger.setBindings({ err });
    throw err;
  }
}

export function isWithinLastTenMonths(date) {
  if (!date) {
    return false; // Date of visit was introduced more than 10 months ago
  }

  const start = new Date(date);
  const end = new Date(start);

  end.setMonth(end.getMonth() + 10);
  end.setHours(23, 59, 59, 999); // set to midnight of the agreement end day

  return Date.now() <= end;
}

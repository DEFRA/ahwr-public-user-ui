import Wreck from "@hapi/wreck";
import { config } from "../config/index.js";
import { StatusCodes } from "http-status-codes";
import { API_CALL_FAILED_CATEGORY, trackError } from "../logging/logger.js";

export async function getApplicationsBySbi(sbi, logger) {
  const endpoint = `${config.applicationApiUri}/applications?sbi=${sbi}`;
  try {
    const { payload } = await Wreck.get(endpoint, {
      json: true,
      headers: { "x-api-key": process.env.BACKEND_API_KEY },
    });

    return payload;
  } catch (error) {
    trackError(logger, error, API_CALL_FAILED_CATEGORY, "Failed to get applications by SBI", {
      kind: endpoint,
    });
    throw error;
  }
}

export const createApplication = async (application, logger) => {
  const endpoint = `${config.applicationApiUri}/applications`;
  try {
    const { payload } = await Wreck.post(endpoint, {
      payload: application,
      json: true,
      headers: { "x-api-key": process.env.BACKEND_API_KEY },
    });

    return payload;
  } catch (error) {
    trackError(logger, error, API_CALL_FAILED_CATEGORY, "Failed to create application", {
      kind: endpoint,
    });
    throw error;
  }
};

export const getHerds = async (applicationReference, typeOfLivestock, logger) => {
  const endpoint = `${config.applicationApiUri}/applications/${applicationReference}/herds?species=${typeOfLivestock}`;

  try {
    const { payload } = await Wreck.get(endpoint, {
      json: true,
      headers: { "x-api-key": process.env.BACKEND_API_KEY },
    });
    return payload;
  } catch (error) {
    const statusCode = error?.output?.statusCode;
    if (statusCode === StatusCodes.NOT_FOUND) {
      return [];
    }

    trackError(logger, error, API_CALL_FAILED_CATEGORY, "Failed to get herds", {
      kind: endpoint,
    });
    throw error;
  }
};

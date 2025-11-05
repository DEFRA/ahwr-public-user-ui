import Wreck from "@hapi/wreck";
import { config } from "../config/index.js";
import { StatusCodes } from "http-status-codes";

export async function getApplicationsBySbi(sbi, logger) {
  const endpoint = `${config.applicationApi.uri}/applications?sbi=${sbi}`;
  try {
    const { payload } = await Wreck.get(endpoint, { json: true });

    return payload;
  } catch (err) {
    logger.setBindings({ error: err });
    throw err;
  }
}

export const createApplication = async (application, logger) => {
  const endpoint = `${config.applicationApi.uri}/applications`;
  try {
    const { payload } = await Wreck.post(endpoint, {
      payload: application,
      json: true,
    });

    return payload;
  } catch (err) {
    logger.setBindings({ error: err });
    throw err;
  }
};

export const getHerds = async (applicationReference, typeOfLivestock, logger) => {
  const endpoint = `${config.applicationApiUri}/applications/${applicationReference}/herds?species=${typeOfLivestock}`;

  try {
    const { payload } = await Wreck.get(endpoint, { json: true });
    return payload;
  } catch (err) {
    if (err.output.statusCode === StatusCodes.NOT_FOUND) {
      return [];
    }
    logger.setBindings({ error: err });
    throw err;
  }
};
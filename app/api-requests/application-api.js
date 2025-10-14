import Wreck from "@hapi/wreck";
import { config } from "../config/index.js";

export async function getApplicationsBySbi(sbi, logger) {
  const endpoint = `${config.applicationApi.uri}/applications?sbi=${sbi}`;
  try {
    const { payload } = await Wreck.get(endpoint, { json: true });

    return payload;
  } catch (err) {
    logger.setBindings({ err });
    throw err;
  }
}

export const createApplication = async (application, logger) => {
  console.log(application);
  const endpoint = `${config.applicationApi.uri}/applications`;
  try {
    const { payload } = await Wreck.post(endpoint, {
      payload: application,
      json: true,
    });

    return payload;
  } catch (err) {
    logger.setBindings({ err });
    throw err;
  }
};

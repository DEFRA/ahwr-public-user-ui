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

export const getHerds = async (_applicationReference, _typeOfLivestock, _logger) => {
  // TODO - make this call real

  // const endpoint = `${config.applicationApiUri}/application/${applicationReference}/herds?species=${typeOfLivestock}`

  // try {
  //   const { payload } = await Wreck.get(
  //     endpoint,
  //     { json: true }
  //   )
  //   return payload
  // } catch (err) {
  //   if (err.output.statusCode === StatusCodes.NOT_FOUND) {
  //     return []
  //   }
  //   logger.setBindings({ err })
  //   throw err
  // }

  return [];
};
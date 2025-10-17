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

export async function submitNewClaim(_data, _logger) {
  // TODO - make this call real

  // const endpoint = `${config.applicationApiUri}/claim`

  // try {
  //   const { payload } = await Wreck.post(endpoint, {
  //     payload: data,
  //     json: true
  //   })

  //   return payload
  // } catch (err) {
  //   logger.setBindings({ err, endpoint })
  //   throw err
  // }
  return Promise.resolve({ reference: "REBC-FAKE-REF1", data: { amount: 1000000 } });
}

export async function getAmount(_data, _logger) {
  // TODO - make this call real

  // const { type, typeOfLivestock, reviewTestResults, piHunt, piHuntAllAnimals, dateOfVisit } = data
  // const endpoint = `${config.applicationApiUri}/claim/get-amount`

  // try {
  //   const { payload } = await Wreck.post(endpoint, {
  //     payload: { type, typeOfLivestock, reviewTestResults, piHunt, piHuntAllAnimals, dateOfVisit },
  //     json: true
  //   })

  //   return payload
  // } catch (err) {
  //   logger.setBindings({ err, endpoint })
  //   throw err
  // }
  return Promise.resolve(100);
}

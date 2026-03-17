import { config } from "../config/index.js";

export const checkIfPoultryAgreement = (latestEndemicsApplication) => {
  console.log({ agreement: latestEndemicsApplication?.reference?.startsWith("POUL") });
  console.log({ flag: config.poultry.enabled });
  return latestEndemicsApplication?.reference?.startsWith("POUL") && config.poultry.enabled;
};

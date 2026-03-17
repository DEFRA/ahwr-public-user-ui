import { APPLICATION_REFERENCE_PREFIX_POULTRY } from "ffc-ahwr-common-library";

import { config } from "../config/index.js";

export const checkIfPoultryAgreement = (latestEndemicsApplication) => {
  return (
    latestEndemicsApplication?.reference?.startsWith(APPLICATION_REFERENCE_PREFIX_POULTRY) &&
    config.poultry.enabled
  );
};

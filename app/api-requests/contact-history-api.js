import Wreck from "@hapi/wreck";
import { config } from "../config/index.js";

export const updateContactHistory = async (
  personSummary,
  organisation,
  crn,
  personRole,
  logger,
) => {
  const endpoint = `${config.applicationApiUri}/applications/contact-history`;

  const contactHistory = {
    farmerName: personSummary.name,
    orgEmail: organisation.email,
    email: personSummary.email ?? organisation.email,
    sbi: organisation.sbi,
    crn,
    personRole,
    address: organisation.address,
    user: "admin",
  };

  try {
    const { payload } = await Wreck.put(endpoint, {
      payload: contactHistory,
      json: true,
    });

    return payload;
  } catch (error) {
    logger.error({ error, endpoint });
    throw error;
  }
};

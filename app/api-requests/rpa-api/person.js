import { sendRPAGetRequest } from "./send-get-request.js";
import { authConfig } from "../../config/auth.js";

function formatPersonName(personSummary) {
  return [personSummary.firstName, personSummary.middleName, personSummary.lastName]
    .filter(Boolean)
    .join(" ");
}

export const getPersonSummary = async ({ apimAccessToken, crn, logger, defraIdAccessToken }) => {
  const { getPersonSummaryUrl } = authConfig.ruralPaymentsAgency;

  const response = await sendRPAGetRequest({
    url: getPersonSummaryUrl,
    defraIdAccessToken,
    headers: {
      crn,
      Authorization: apimAccessToken,
    },
  });

  const personSummary = response._data;

  // TODO - find an alternative to setBindings
  logger.setBindings({ personSummaryId: personSummary.id });

  return { ...personSummary, name: formatPersonName(personSummary) };
};

import { sendRPAGetRequest } from "./send-get-request.js";
import { getSessionData, sessionEntryKeys, sessionKeys } from "../../session/index.js";
import { authConfig } from "../../config/auth.js";

export const getCphNumbers = async ({ request, apimAccessToken, defraIdAccessToken }) => {
  const response = await sendRPAGetRequest({
    url: authConfig.ruralPaymentsAgency.getCphNumbersUrl.replace(
      "organisationId",
      getSessionData(request, sessionEntryKeys.customer, sessionKeys.customer.organisationId),
    ),
    defraIdAccessToken,
    headers: {
      crn: getSessionData(request, sessionEntryKeys.customer, sessionKeys.customer.crn),
      Authorization: apimAccessToken,
    },
  });

  if (!response.success) {
    return null;
  }
  return response.data.map((cph) => cph.cphNumber);
};

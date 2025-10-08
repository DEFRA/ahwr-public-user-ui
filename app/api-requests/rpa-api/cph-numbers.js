import { sendRPAGetRequest } from "./send-get-request.js";
import { getCustomer } from "../../session/index.js";
import { sessionKeys } from "../../session/keys.js";
import { authConfig } from "../../config/auth.js";

export const getCphNumbers = async ({ request, apimAccessToken, defraIdAccessToken }) => {
  const response = await sendRPAGetRequest({
    url: authConfig.ruralPaymentsAgency.getCphNumbersUrl.replace(
      "organisationId",
      getCustomer(request, sessionKeys.customer.organisationId),
    ),
    defraIdAccessToken,
    headers: {
      crn: getCustomer(request, sessionKeys.customer.crn),
      Authorization: apimAccessToken,
    },
  });

  if (!response.success) {
    return null;
  }
  return response.data.map((cph) => cph.cphNumber);
};

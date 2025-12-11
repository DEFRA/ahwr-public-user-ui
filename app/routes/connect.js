import { StatusCodes } from "http-status-codes";
import { fetchNewToken } from "../auth/client-credential-grant/retrieve-apim-access-token.js";
import { authConfig } from "../config/auth.js";
import { getPersonSummary } from "../api-requests/rpa-api/person.js";

export const connectHandlers = [
  {
    method: "GET",
    path: "/connect",
    options: {
      auth: false,
      plugins: {
        yar: { skip: true },
      },
    },
    handler: async (request, h) => {
      request.logger.info(`Retrieving an APIM access token from ${`${authConfig.apim.hostname}${authConfig.apim.oAuthPath}`}`);
      const apimAccessToken = await fetchNewToken();
      request.logger.info(`Checking connectivity to ${authConfig.ruralPaymentsAgency.hostname}${authConfig.ruralPaymentsAgency.getPersonSummaryUrl}`);
      await getPersonSummary({ apimAccessToken, crn: '123abc', logger: request.logger, defraIdAccessToken: 'no-defra-id-token' })
      return h.response(`done`).code(StatusCodes.OK);
    },
  },
];

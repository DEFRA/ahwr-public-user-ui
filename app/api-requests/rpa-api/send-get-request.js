import { apiHeaders } from "../../constants/constants.js";
import { authConfig } from "../../config/auth.js";
import { config } from "../../config/index.js";
import Wreck from "@hapi/wreck";

export const sendRPAGetRequest = async ({ url, defraIdAccessToken, headers }) => {
  const completedHeaders = {
    ...headers,
    [apiHeaders.xForwardedAuthorization]: defraIdAccessToken,
    [apiHeaders.ocpSubscriptionKey]: authConfig.apim.ocpSubscriptionKey,
  };

  const { hostname } = authConfig.ruralPaymentsAgency;

  const { payload } = await Wreck.get(`${hostname}${url}`, {
    headers: completedHeaders,
    json: true,
    rejectUnauthorized: false,
    timeout: config.wreckHttp.timeoutMilliseconds,
  });

  return payload;
};

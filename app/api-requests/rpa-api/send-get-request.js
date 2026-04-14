import { apiHeaders } from "../../constants/constants.js";
import { authConfig } from "../../config/auth.js";
import { config } from "../../config/index.js";
import Wreck from "@hapi/wreck";
import { API_CALL_FAILED_CATEGORY, trackError, getLogger } from "../../logging/logger.js";

export const sendRPAGetRequest = async ({ url, defraIdAccessToken, headers }) => {
  const completedHeaders = {
    ...headers,
    [apiHeaders.xForwardedAuthorization]: defraIdAccessToken,
    [apiHeaders.ocpSubscriptionKey]: authConfig.apim.ocpSubscriptionKey,
  };

  const { hostname } = authConfig.ruralPaymentsAgency;
  const fullUrl = `${hostname}${url}`;

  try {
    const { payload } = await Wreck.get(fullUrl, {
      headers: completedHeaders,
      json: true,
      rejectUnauthorized: false,
      timeout: config.wreckHttp.timeoutMilliseconds,
    });

    return payload;
  } catch (error) {
    trackError(getLogger(), error, API_CALL_FAILED_CATEGORY, "RPA API GET request failed", {
      kind: fullUrl,
    });
    throw error;
  }
};

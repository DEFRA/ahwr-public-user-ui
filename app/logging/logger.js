import { pino } from "pino";
import { loggerOptions } from "./logger-options.js";

export const API_CALL_FAILED_CATEGORY = "api-call-failed";
const logger = pino(loggerOptions);

export function getLogger() {
  return logger;
}

export const trackError = (loggerInstance, error, category, message, properties) => {
  loggerInstance.error(
    {
      error,
      event: {
        type: "exception",
        severity: "error",
        category,
        ...properties,
      },
    },
    message,
  );
};

export const trackEvent = (loggerInstance, type, category, properties) => {
  loggerInstance.info({
    event: {
      type,
      category,
      ...properties,
    },
  });
};

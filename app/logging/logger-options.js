import { ecsFormat } from "@elastic/ecs-pino-format";
import { getTraceId } from "@defra/hapi-tracing";
import { config } from "../config/index.js";

const name = config.get("name");
const serviceVersion = config.get("serviceVersion");
const logLevel = config.get("logLevel");
const logFormat = config.get("logFormat");
const logRedact = config.get("logRedact");

const formatters = {
  ecs: {
    ...ecsFormat({
      serviceVersion,
      serviceName: name,
    }),
  },
  "pino-pretty": {
    transport: {
      target: "pino-pretty",
      options: {
        singleLine: true,
        colorize: true,
      },
    },
  },
};

export const loggerOptions = {
  ignorePaths: ["/health"],
  ignoreTags: ["assets"],
  redact: {
    paths: logRedact,
    remove: true,
  },
  level: logLevel,
  ...formatters[logFormat],
  nesting: true,
  serializers: {
    error: (err) => {
      if (err instanceof Error) {
        return {
          message: err.message,
          stack_trace: err.stack,
          type: err.name,
        };
      }
      return err;
    },
  },
  mixin() {
    const mixinValues = {};
    const traceId = getTraceId();
    if (traceId) {
      mixinValues.trace = { id: traceId };
    }
    return mixinValues;
  },
};

import { ecsFormat } from "@elastic/ecs-pino-format";
import { getTraceId } from "@defra/hapi-tracing";
import stdSerializers from "pino-std-serializers";
import { config } from "../config/index.js";

const { name, serviceVersion, logLevel, logFormat, logRedact } = config;

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
    req: (req) => {
      const serialized = stdSerializers.req(req);
      if (serialized.query && typeof serialized.query === "object") {
        serialized.query = new URLSearchParams(serialized.query).toString();
      }
      return serialized;
    },
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

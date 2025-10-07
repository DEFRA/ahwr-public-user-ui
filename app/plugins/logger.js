import pino from "hapi-pino";

const transport = {
  target: "pino-pretty",
  options: {
    singleLine: true,
    colorize: true,
  },
};
const testLevel = { level: "silent" };

const req = (req) => ({
  id: req.id,
  method: req.method,
  url: req.url,
});

const res = (res) => ({
  statusCode: res.statusCode,
});

const err = (err) => ({
  type: err.type,
  name: err.name,
  message: err.message,
  isBoom: err.isBoom,
  isServer: err.isServer,
  payload: err.payload,
  stack: err.stack,
  data: {
    isResponseError: err?.data?.isResponseError,
    payload: err?.data?.payload,
  },
});

export const loggingPlugin = {
  plugin: pino,
  options: {
    name: "ffc-ahwr-dashboard",
    ...(process.env.NODE_ENV === "test" && testLevel),
    formatters: {
      level: (level) => ({ level }),
    },
    ignorePaths: ["/healthy", "/healthz"],
    ignoreTags: ["assets"],
    serializers: {
      req,
      res,
      err,
    },
    ...(process.env.USE_PRETTY_PRINT === "true" && { transport }),
  },
};

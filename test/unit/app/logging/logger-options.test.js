import { loggerOptions } from "../../../../app/logging/logger-options.js";
import { config } from "../../../../app/config/index.js";
import { getTraceId } from "@defra/hapi-tracing";

jest.mock("@defra/hapi-tracing", () => ({ getTraceId: jest.fn() }));

describe("logger options", () => {
  const env = process.env;

  afterEach(() => {
    process.env = env;
  });

  test("resolves the ecs log format when tests run, whatever the developer environment asks for", () => {
    expect(config.get("logFormat")).toBe("ecs");
  });

  test("still configures a pretty transport when the service itself runs with pretty printing on", () => {
    jest.resetModules();
    process.env = { ...env, USE_PRETTY_PRINT: "true" };

    // re-required deliberately: a second module instance built against the flipped env
    const { loggerOptions: prettyOptions } = require("../../../../app/logging/logger-options.js");

    expect(prettyOptions.transport).toEqual({
      target: "pino-pretty",
      options: { singleLine: true, colorize: true },
    });
  });

  test("configures no transport, so no thread-stream worker is spawned", () => {
    expect(loggerOptions).not.toHaveProperty("transport");
  });

  test("adds the trace id to every log line while a request is being traced", () => {
    getTraceId.mockReturnValue("trace-1234");

    expect(loggerOptions.mixin()).toEqual({ trace: { id: "trace-1234" } });
  });

  test("adds no trace to a log line when nothing is being traced", () => {
    getTraceId.mockReturnValue(undefined);

    expect(loggerOptions.mixin()).toEqual({});
  });

  test("serialises an Error into message, stack_trace and type", () => {
    const error = new Error("test");

    expect(loggerOptions.serializers.error(error)).toEqual({
      message: "test",
      stack_trace: error.stack,
      type: "Error",
    });
  });

  test("leaves a non-Error untouched when serialising", () => {
    const notAnError = { some: "object" };

    expect(loggerOptions.serializers.error(notAnError)).toBe(notAnError);
  });
});

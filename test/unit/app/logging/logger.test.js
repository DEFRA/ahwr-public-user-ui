import { getLogger, trackError, trackEvent } from "../../../../app/logging/logger.js";

describe("logger construction", () => {
  const stubLogger = () => ({ info: jest.fn(), error: jest.fn() });

  beforeEach(() => {
    jest.resetModules();
  });

  test("does not construct a pino logger when the module is imported", () => {
    const pino = jest.fn(stubLogger);
    jest.doMock("pino", () => ({ pino }));

    require("../../../../app/logging/logger.js");

    expect(pino).not.toHaveBeenCalled();
  });

  test("constructs the pino logger on the first getLogger call", () => {
    const pino = jest.fn(stubLogger);
    jest.doMock("pino", () => ({ pino }));

    require("../../../../app/logging/logger.js").getLogger();

    expect(pino).toHaveBeenCalledTimes(1);
  });

  test("returns the same logger instance on every subsequent getLogger call", () => {
    jest.doMock("pino", () => ({ pino: jest.fn(stubLogger) }));

    const { getLogger: lazyGetLogger } = require("../../../../app/logging/logger.js");

    expect(lazyGetLogger()).toBe(lazyGetLogger());
  });
});

describe("logger", () => {
  test("getLogger returns a pino logger instance", () => {
    const logger = getLogger();
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe("function");
    expect(typeof logger.error).toBe("function");
  });

  test("trackError logs an error with the correct structure", () => {
    const logger = getLogger();
    const spy = jest.spyOn(logger, "error").mockImplementation(() => {});

    const testError = new Error("Test error");
    const category = "test-category";
    const message = "This is a test error message";

    trackError(logger, testError, category, message);

    expect(spy).toHaveBeenCalledWith(
      {
        error: testError,
        event: {
          type: "exception",
          category,
        },
      },
      message,
    );

    spy.mockRestore();
  });

  test("trackEvent logs an info entry with the expected structure", () => {
    const logger = getLogger();
    const spy = jest.spyOn(logger, "info").mockImplementation(() => {});

    const category = "test-category";
    const type = "example-event";

    trackEvent(logger, type, category, { ref: "12345" });

    expect(spy).toHaveBeenCalledWith({
      event: {
        type,
        category,
        ref: "12345",
      },
    });

    spy.mockRestore();
  });
});

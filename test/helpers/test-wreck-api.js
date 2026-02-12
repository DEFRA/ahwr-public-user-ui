import Wreck from "@hapi/wreck";
import { trackError } from "../../app/logging/logger.js";
import { config } from "../../app/config/index.js";

export async function testWreckApiFunction({
  fn,
  method,
  endpoint,
  args = [],
  outboundPayload,
  returnPayload,
  logger,
}) {
  Wreck[method].mockResolvedValueOnce({ payload: returnPayload });

  const result = await fn(...args, logger);

  expect(result).toBe(returnPayload);

  if (method === "get") {
    expect(Wreck.get).toHaveBeenCalledWith(endpoint, {
      json: true,
      headers: { "x-api-key": config.get("apiKeys.applicationBackendApiKey") },
    });
  } else {
    expect(Wreck[method]).toHaveBeenCalledWith(endpoint, {
      payload: outboundPayload,
      json: true,
      headers: { "x-api-key": config.get("apiKeys.applicationBackendApiKey") },
    });
  }

  expect(logger.error).not.toHaveBeenCalled();

  const expectedError = new Error("Whoops");
  Wreck[method].mockImplementation(() => {
    throw expectedError;
  });

  await expect(fn(...args, logger)).rejects.toThrow("Whoops");

  if (method === "get") {
    expect(Wreck.get).toHaveBeenCalledWith(endpoint, {
      json: true,
      headers: { "x-api-key": config.get("apiKeys.applicationBackendApiKey") },
    });
  } else {
    expect(Wreck[method]).toHaveBeenCalledWith(endpoint, {
      payload: outboundPayload,
      json: true,
      headers: { "x-api-key": config.get("apiKeys.applicationBackendApiKey") },
    });
  }

  expect(trackError).toHaveBeenCalledWith(
    logger,
    expectedError,
    "api-call-failed",
    expect.any(String),
    {
      kind: endpoint,
    },
  );
}

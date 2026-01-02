import Wreck from "@hapi/wreck";
import { trackError } from "../../app/logging/logger.js";

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
    expect(Wreck.get).toHaveBeenCalledWith(endpoint, { json: true });
  } else {
    expect(Wreck[method]).toHaveBeenCalledWith(endpoint, {
      payload: outboundPayload,
      json: true,
    });
  }

  expect(logger.error).not.toHaveBeenCalled();

  const expectedError = new Error("Whoops");
  Wreck[method].mockImplementation(() => {
    throw expectedError;
  });

  await expect(fn(...args, logger)).rejects.toThrow("Whoops");

  if (method === "get") {
    expect(Wreck.get).toHaveBeenCalledWith(endpoint, { json: true });
  } else {
    expect(Wreck[method]).toHaveBeenCalledWith(endpoint, {
      payload: outboundPayload,
      json: true,
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

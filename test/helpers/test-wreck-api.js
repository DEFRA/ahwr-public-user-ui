import Wreck from "@hapi/wreck";

export function testWreckApiFunction({
  fn,
  method,
  endpoint,
  args = [],
  outboundPayload,
  returnPayload,
  logger,
}) {
  describe(fn.name, () => {
    it("returns payload when successful", async () => {
      Wreck[method].mockResolvedValueOnce({ payload: returnPayload });

      const result = await fn(...args, logger);

      expect(result).toBe(returnPayload);

      if (method === "get") {
        expect(Wreck.get).toHaveBeenCalledWith(endpoint, { json: true });
      } else {
        expect(Wreck.post).toHaveBeenCalledWith(endpoint, {
          payload: outboundPayload,
          json: true,
        });
      }

      expect(logger.error).not.toHaveBeenCalled();
    });

    it("logs and rethrows errors", async () => {
      const expectedError = new Error("Whoops");
      Wreck[method].mockImplementation(() => {
        throw expectedError;
      });

      await expect(fn(...args, logger)).rejects.toThrow("Whoops");

      if (method === "get") {
        expect(Wreck.get).toHaveBeenCalledWith(endpoint, { json: true });
      } else {
        expect(Wreck.post).toHaveBeenCalledWith(endpoint, {
          payload: outboundPayload,
          json: true,
        });
      }

      expect(logger.error).toHaveBeenCalledWith({ error: expectedError });
    });
  });
}

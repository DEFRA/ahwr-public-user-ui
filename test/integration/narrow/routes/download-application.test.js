import { createServer } from "../../../../app/server.js";
import { StatusCodes } from "http-status-codes";

test("get /download-application", async () => {
  const server = await createServer();

  const sbi = "106354662";
  const reference = "RESH-A89F-7776";

  const res = await server.inject({
    url: `/download-application/${sbi}/${reference}`,
    auth: {
      credentials: {},
      strategy: "cookie",
    },
  });

  expect(res.statusCode).toBe(StatusCodes.OK);
});

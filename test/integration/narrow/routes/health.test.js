import { createServer } from "../../../../app/server.js";

test("get /health", async () => {
  const server = await createServer();
  const res = await server.inject({
    url: "/health",
  });

  expect(res.statusCode).toBe(200);
});

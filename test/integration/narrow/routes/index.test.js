import { createServer } from "../../../../app/server.js";

describe("root / path", () => {
  let server;

  beforeAll(async () => {
    server = await createServer();
  });

  test("get /", async () => {
    const res = await server.inject({
      url: "/",
      auth: {
        credentials: {},
        strategy: "cookie",
      },
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/vet-visits");
  });

  test("get /: no auth", async () => {
    const res = await server.inject({
      url: "/",
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toMatch('/sign-in');
  });
});

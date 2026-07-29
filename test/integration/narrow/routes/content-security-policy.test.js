import { createServer } from "../../../../app/server.js";

describe("Content security policy", () => {
  let server;
  let response;

  beforeAll(async () => {
    server = await createServer();
    await server.initialize();
    response = await server.inject({ method: "GET", url: "/accessibility" });
  });

  afterAll(async () => {
    await server.stop();
  });

  test("does not contain unsafe directives", () => {
    const cspHeader = response.headers["content-security-policy"];

    expect(cspHeader).not.toMatch("unsafe-eval");
    expect(cspHeader).not.toMatch("unsafe-inline");
  });
});

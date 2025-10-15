import { StatusCodes } from "http-status-codes";
import { createServer } from "../../../../app/server";
import { DEFRA_ID_BASE_URL } from "../../../../app/auth/auth-code-grant/request-authorization-code-url";
import { randomUUID } from "crypto";

describe("/sign-in", () => {
  let server;

  beforeAll(async () => {
    server = await createServer();
  });

  afterAll(async () => {
    await server.stop();
    jest.resetAllMocks();
  });

  test("can send a request without a relationshipId", async () => {
    const res = await server.inject({
      url: "/sign-in",
      method: "GET",
    });

    expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY);
    expect(res.headers.location.href).toMatch(DEFRA_ID_BASE_URL);
  });

  test("can send a request with a relationshipId and it is passed in the redirect URI", async () => {
    const relationshipId = randomUUID();
    const res = await server.inject({
      url: `/sign-in?relationshipId=${relationshipId}`,
      method: "GET",
    });

    expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY);
    expect(res.headers.location.href).toMatch(DEFRA_ID_BASE_URL);
    expect(res.headers.location.href).toContain(relationshipId);
  });
});

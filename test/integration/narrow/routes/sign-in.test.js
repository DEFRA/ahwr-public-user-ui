import { StatusCodes } from "http-status-codes";
import { createServer } from "../../../../app/server";
import { DEFRA_ID_BASE_URL } from "../../../../app/auth/auth-code-grant/request-authorization-code-url";
import { randomUUID } from "crypto";
import { metricsCounter } from "../../../../app/lib/metrics.js";

jest.mock("../../../../app/lib/metrics.js");

describe("/sign-in", () => {
  let server;

  beforeAll(async () => {
    server = await createServer();
  });

  afterAll(async () => {
    await server.stop();
    jest.resetAllMocks();
  });

  test("can send a request without a ssoOrgId", async () => {
    const res = await server.inject({
      url: "/sign-in",
      method: "GET",
    });

    expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY);
    expect(res.headers.location.href).toMatch(DEFRA_ID_BASE_URL);
    expect(metricsCounter).toHaveBeenCalledWith("sign_in");
  });

  test("can send a request with a ssoOrgId and it is passed in the redirect URI", async () => {
    const ssoOrgId = randomUUID();
    const res = await server.inject({
      url: `/sign-in?ssoOrgId=${ssoOrgId}`,
      method: "GET",
    });

    expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY);
    expect(res.headers.location.href).toMatch(DEFRA_ID_BASE_URL);
    expect(res.headers.location.href).toContain(ssoOrgId);
    expect(metricsCounter).toHaveBeenCalledWith("sign_in");
  });
});

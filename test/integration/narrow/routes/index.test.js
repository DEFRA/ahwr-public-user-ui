import { createServer } from "../../../../app/server.js";
import { DEFRA_ID_BASE_URL } from "../../../../app/auth/auth-code-grant/request-authorization-code-url.js";

jest.mock("../../../../app/constants/claim-statuses.js", () => ({
  closedViewStatuses: [2, 10, 7, 9, 8],
}));

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
    expect(res.headers.location.href).toMatch(DEFRA_ID_BASE_URL);
  });
});

import { createServer } from "../../../../app/server.js";

jest.mock("../../../../app/config", () => {
  const actual = jest.requireActual("../../../../app/config");
  return {
    ...actual,
    config: { ...actual.config, csp: { reportOnly: false } },
  };
});

test("omits the Content-Security-Policy-Report-Only header only when explicitly disabled", async () => {
  const server = await createServer();

  const { headers } = await server.inject({
    url: "/",
    auth: {
      credentials: {},
      strategy: "cookie",
    },
  });

  expect(headers["content-security-policy-report-only"]).toBeUndefined();
});

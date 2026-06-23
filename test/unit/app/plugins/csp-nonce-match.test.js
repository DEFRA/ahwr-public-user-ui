import { createServer } from "../../../../app/server.js";

jest.mock("../../../../app/config", () => {
  const actual = jest.requireActual("../../../../app/config");
  return {
    ...actual,
    config: {
      ...actual.config,
      csp: { reportOnly: true },
      googleTagManagerKey: "GTM-TEST",
    },
  };
});

jest.mock("../../../../app/cookies", () => ({
  ...jest.requireActual("../../../../app/cookies"),
  getCurrentPolicy: jest.fn(() => ({
    confirmed: true,
    essential: true,
    analytics: true,
  })),
}));

test("renders the tag-manager script with a nonce matching the report-only header", async () => {
  const server = await createServer();

  const { headers, payload } = await server.inject({
    url: "/accessibility",
    auth: {
      credentials: {},
      strategy: "cookie",
    },
  });

  const nonce = /'nonce-([^']+)'/.exec(headers["content-security-policy-report-only"] ?? "")?.[1];

  expect(nonce).toBeDefined();
  expect(payload).toContain(`<script nonce="${nonce}">`);
});

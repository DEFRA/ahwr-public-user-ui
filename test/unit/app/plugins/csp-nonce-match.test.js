import { createServer } from "../../../../app/server.js";

jest.mock("../../../../app/config", () => {
  const actual = jest.requireActual("../../../../app/config");
  return {
    ...actual,
    config: {
      ...actual.config,
      csp: { enforce: true },
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

test("renders the tag-manager script with a nonce matching the enforced policy", async () => {
  const server = await createServer();

  const { headers, payload } = await server.inject({
    url: "/accessibility",
    auth: {
      credentials: {},
      strategy: "cookie",
    },
  });

  const nonce = /'nonce-([^']+)'/.exec(headers["content-security-policy"] ?? "")?.[1];

  expect(nonce).toBeDefined();
  expect(payload).toContain(`<script nonce="${nonce}">`);
});

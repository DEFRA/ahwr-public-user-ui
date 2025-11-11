import { createServer } from "../../../../app/server.js";
import { config } from "../../../../app/config/index.js";
import { getSessionData } from "../../../../app/session/index.js";

jest.mock("../../../../app/config/index.js", () => ({
  config: {
    ...jest.requireActual("../../../../app/config/index.js").config,
    lfsUpdate: {
      enabled: true,
      uri: "http://this-is-a-test-uri/home?ssoOrgId=",
    },
  },
}));
jest.mock("../../../../app/session/index.js", () => ({
  ...jest.requireActual("../../../../app/session/index.js"),
  getSessionData: jest.fn(() => ({
    id: "FAKE_ORG_123",
  })),
}));

describe("/update-details", () => {
  let server;

  beforeAll(async () => {
    server = await createServer();
  });

  afterAll(async () => {
    await server.stop();
    jest.resetAllMocks();
  });

  test("redirects to LFS when update is enabled", async () => {
    const res = await server.inject({
      url: "/update-details",
      method: "GET",
      auth: {
        credentials: {},
        strategy: "cookie",
      },
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("http://this-is-a-test-uri/home?ssoOrgId=FAKE_ORG_123");
    expect(getSessionData).toHaveBeenCalled();
  });

  test("redirects to /check-details when update is disabled", async () => {
    config.lfsUpdate.enabled = false;

    const res = await server.inject({
      url: "/update-details",
      method: "GET",
      auth: {
        credentials: {},
        strategy: "cookie",
      },
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/check-details");
  });
});

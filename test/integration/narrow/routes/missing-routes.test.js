import { StatusCodes } from "http-status-codes";
import { createServer } from "../../../../app/server.js";
import { getEndemicsClaim } from "../../../../app/session/index.js";
import globalJsdom from "global-jsdom";
import { getByRole } from "@testing-library/dom";
import { config } from "../../../../app/config/index.js";

jest.mock("../../../../app/session/index.js");

jest.mock("../../../../app/constants/claim-statuses.js", () => ({
  closedViewStatuses: [2, 10, 7, 9, 8],
}));

describe("Missing routes", () => {
  let server;
  let cleanupJsdom;

  beforeAll(async () => {
    server = await createServer();
    await server.initialize();
  });

  afterAll(async () => {
    await server.stop();

    if (cleanupJsdom) {
      cleanupJsdom();
    }
  });

  test("GET an unregistered route when user is signed out", async () => {
    const options = {
      method: "GET",
      url: "/random-route",
    };

    const res = await server.inject(options);

    expect(res.statusCode).toBe(StatusCodes.NOT_FOUND);

    cleanupJsdom = globalJsdom(res.payload);

    expect(
      getByRole(document.body, "link", {
        name: "Go back home",
      }),
    ).toHaveProperty("href", `${config.serviceUri}vet-visits`);

    expect(
      getByRole(document.body, "link", {
        name: "Sign in",
      }),
    ).toHaveProperty("href", `${config.serviceUri}sign-in`);
  });

  test("GET an unregistered route when user is signed in", async () => {
    cleanupJsdom();
    getEndemicsClaim.mockReturnValue({ organisation: {} });

    const options = {
      method: "GET",
      url: "/random-route",
    };

    const res = await server.inject(options);

    cleanupJsdom = globalJsdom(res.payload);

    expect(
      getByRole(document.body, "link", {
        name: "Go back home",
      }),
    ).toHaveProperty("href", `${config.serviceUri}vet-visits`);

    expect(() => getByRole(document.body, "link", { name: "Sign in" })).toThrow(); // Proves the element is not there
  });
});

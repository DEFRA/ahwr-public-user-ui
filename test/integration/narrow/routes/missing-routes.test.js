import { StatusCodes } from "http-status-codes";
import { createServer } from "../../../../app/server.js";
import { getSessionData, sessionEntryKeys, sessionKeys } from "../../../../app/session/index.js";
import globalJsdom from "global-jsdom";
import { getByRole } from "@testing-library/dom";
import { config } from "../../../../app/config/index.js";
import { when } from "jest-when";

jest.mock("../../../../app/session", () => {
  const actual = jest.requireActual("../../../../app/session");
  // Mocking everything apart from sessionKeys and sessionEntryKeys
  const mocked = Object.keys(actual).reduce((acc, key) => {
    acc[key] = key === "sessionKeys" || key === "sessionEntryKeys" ? actual[key] : jest.fn();
    return acc;
  }, {});
  return mocked;
});

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
    when(getSessionData)
      .calledWith(
        expect.anything(),
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.organisation,
      )
      .mockReturnValue({});

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

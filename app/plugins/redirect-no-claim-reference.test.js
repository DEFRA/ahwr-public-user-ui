import Hapi from "@hapi/hapi";
import { redirectNoClaimReferencePlugin } from "./redirect-no-claim-reference.js";
import { dashboardRoutes, claimRoutes } from "../constants/routes.js";

import { getSessionData } from "../session/index.js";

jest.mock("../session/index.js", () => ({
  ...jest.requireActual("../session/index.js"),
  getSessionData: jest.fn(),
}));

describe("redirectNoClaimReferencePlugin", () => {
  let server;

  beforeAll(async () => {
    server = Hapi.server();
    server.route({
      method: "GET",
      path: claimRoutes.checkAnswers,
      handler: () => "ok",
    });
    await server.register(redirectNoClaimReferencePlugin);
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await server.stop();
  });

  it("redirects when no claim reference exists", async () => {
    getSessionData.mockReturnValue(undefined);

    const response = await server.inject({
      method: "GET",
      url: claimRoutes.checkAnswers,
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe(dashboardRoutes.manageYourClaims);
  });

  it("allows request when claim reference exists", async () => {
    getSessionData.mockReturnValue("IAHW-1LZ5-ELVQ");

    const response = await server.inject({
      method: "GET",
      url: claimRoutes.checkAnswers,
    });

    expect(response.statusCode).toBe(200);
  });

  it("does not redirect on excluded route", async () => {
    server.route({
      method: "GET",
      path: claimRoutes.whichSpecies,
      handler: () => "ok",
    });

    getSessionData.mockReturnValue(undefined);

    const response = await server.inject({
      method: "GET",
      url: claimRoutes.whichSpecies,
    });

    expect(response.statusCode).toBe(200);
  });
});

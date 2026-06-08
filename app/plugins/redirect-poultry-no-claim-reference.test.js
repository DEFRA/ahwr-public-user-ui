import Hapi from "@hapi/hapi";
import { redirectPoultryNoClaimReferencePlugin } from "./redirect-poultry-no-claim-reference.js";
import { dashboardRoutes, poultryClaimRoutes } from "../constants/routes.js";
import { config } from "../config/index.js";

import { getSessionData } from "../session/index.js";

jest.mock("../session/index.js", () => ({
  ...jest.requireActual("../session/index.js"),
  getSessionData: jest.fn(),
}));

describe("redirectPoultryNoClaimReferencePlugin", () => {
  let server;

  beforeAll(async () => {
    server = Hapi.server();
    server.route({
      method: "GET",
      path: poultryClaimRoutes.checkAnswers,
      handler: () => "ok",
    });
    await server.register(redirectPoultryNoClaimReferencePlugin);
    config.poultry.enabled = true;
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
      url: poultryClaimRoutes.checkAnswers,
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe(dashboardRoutes.poultryManageYourClaims);
  });

  it("allows request when claim reference exists", async () => {
    getSessionData.mockReturnValue("POUL-1LZ5-ELVQ");

    const response = await server.inject({
      method: "GET",
      url: poultryClaimRoutes.checkAnswers,
    });

    expect(response.statusCode).toBe(200);
  });

  it("does not redirect on excluded route", async () => {
    server.route({
      method: "GET",
      path: poultryClaimRoutes.dateOfVisit,
      handler: () => "ok",
    });

    getSessionData.mockReturnValue(undefined);

    const response = await server.inject({
      method: "GET",
      url: poultryClaimRoutes.dateOfVisit,
    });

    expect(response.statusCode).toBe(200);
  });

  it("does not redirect when poultry feature is disabled", async () => {
    config.poultry.enabled = false;

    getSessionData.mockReturnValue(undefined);

    const response = await server.inject({
      method: "GET",
      url: poultryClaimRoutes.checkAnswers,
    });

    expect(response.statusCode).toBe(200);
  });
});

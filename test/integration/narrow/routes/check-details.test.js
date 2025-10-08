import { StatusCodes } from "http-status-codes";
import { createServer } from "../../../../app/server";
import { getEndemicsClaim, getCustomer, getSignInRedirect } from "../../../../app/session";
import { getCrumbs } from "../../../utils/get-crumbs";
import { config } from "../../../../app/config";

jest.mock("../../../../app/constants/claim-statuses.js", () => ({
  closedViewStatuses: [2, 10, 7, 9, 8],
}));

jest.mock("../../../../app/session/index.js");
jest.mock("../../../../app/auth/cookie-auth/cookie-auth.js");

getCustomer.mockReturnValue({ crn: 213313 });

describe("/check-details", () => {
  let server;
  let crumb;

  beforeAll(async () => {
    server = await createServer();
    crumb = await getCrumbs(server);
  });

  afterAll(async () => {
    await server.stop();
    jest.resetAllMocks();
  });

  test("GET /check-details throws an error if there is no organisation in the session", async () => {
    const res = await server.inject({
      url: "/check-details",
      method: "GET",
      auth: {
        credentials: {},
        strategy: "cookie",
      },
    });

    expect(res.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
  });

  test("GET /check-details with organisation in the session, happy path", async () => {
    getEndemicsClaim.mockReturnValue({
      organisation: {
        cph: "33/333/3333",
        sbi: "333333333",
        name: "My Farm",
        farmerName: "Farmer Giles",
        email: "test@test.com",
        orgEmail: "org@email.com",
        isTest: true,
        address: "Long dusty road, Middle-of-knowhere, In the countryside, CC33 3CC",
      },
    });

    const res = await server.inject({
      url: "/check-details",
      method: "GET",
      auth: {
        credentials: {},
        strategy: "cookie",
      },
    });

    expect(res.statusCode).toBe(StatusCodes.OK);
  });

  test("POST /check-details with no payload returns a 400", async () => {
    const res = await server.inject({
      url: "/check-details",
      method: "POST",
      auth: {
        credentials: {},
        strategy: "cookie",
      },
      payload: { crumb },
      headers: { cookie: `crumb=${crumb}` },
    });

    expect(res.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });

  test("POST /check-details with confirmCheckDetails in payload but not a valid answer returns a 400", async () => {
    const res = await server.inject({
      url: "/check-details",
      method: "POST",
      auth: {
        credentials: {},
        strategy: "cookie",
      },
      payload: { crumb, confirmCheckDetails: "maybe" },
      headers: { cookie: `crumb=${crumb}` },
    });

    expect(res.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });

  test("POST /check-details with confirmCheckDetails = yes in payload, and redirects to apply", async () => {
    getSignInRedirect.mockReturnValueOnce(true);

    const res = await server.inject({
      url: "/check-details",
      method: "POST",
      auth: {
        credentials: {},
        strategy: "cookie",
      },
      payload: { crumb, confirmCheckDetails: "yes" },
      headers: { cookie: `crumb=${crumb}` },
    });

    expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY);
    expect(res.headers.location).toEqual(
      `${config.applyServiceUri}/endemics/you-can-claim-multiple`,
    );
  });

  test("POST /check-details with valid confirmCheckDetails = yes in payload, and redirects to dashboard", async () => {
    getSignInRedirect.mockReturnValueOnce(null);

    const res = await server.inject({
      url: "/check-details",
      method: "POST",
      auth: {
        credentials: {},
        strategy: "cookie",
      },
      payload: { crumb, confirmCheckDetails: "yes" },
      headers: { cookie: `crumb=${crumb}` },
    });

    expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY);
    expect(res.headers.location).toEqual("/vet-visits");
  });

  test("POST /check-details with valid confirmCheckDetails = no in payload, and renders update details page", async () => {
    const res = await server.inject({
      url: "/check-details",
      method: "POST",
      auth: {
        credentials: {},
        strategy: "cookie",
      },
      payload: { crumb, confirmCheckDetails: "no" },
      headers: { cookie: `crumb=${crumb}` },
    });

    expect(res.statusCode).toBe(StatusCodes.OK);
  });
});

import { StatusCodes } from "http-status-codes";
import { createServer } from "../../../../app/server";
import { setServerState } from "../../../helpers/set-server-state";
import { randomUUID } from "node:crypto";
import * as authModule from "../../../../app/auth/authenticate";
import * as apimModule from "../../../../app/auth/client-credential-grant/retrieve-apim-access-token";
import * as personAndOrgModule from "../../../../app/api-requests/rpa-api/get-person-and-org";
import * as checkLoginValidModule from "../../../../app/routes/utils/check-login-valid";
import * as cphCheckModule from "../../../../app/api-requests/rpa-api/cph-check";

jest.mock("applicationinsights", () => ({
  defaultClient: { trackException: jest.fn(), trackEvent: jest.fn() },
  dispose: jest.fn(),
}));

jest.mock("../../../../app/session/index.js", () => ({
  ...jest.requireActual("../../../../app/session/index.js"),
  setFarmerApplyData: jest.fn(),
}));

const unitTestDefraId = "https://local-defra-id.com/stuff";

const mockOrgAndPerson = {
  orgDetails: {
    organisation: {
      address:
        "1 Brown Lane,Smithering,West Sussex,England,UK,Thompsons,Sisterdene,1-30,Grey Building,Brown Lane,Grenwald,West Sussex,WS11 2DS,GBR",
      email: "unit@test.email.com.test",
      name: "Unit test org",
      sbi: 999000,
    },
    organisationPermission: true,
  },
  personSummary: {
    id: 12345,
    name: "Farmer Tom",
    email: "farmertomstestemail@test.com.test",
  },
};

jest.mock("../../../../app/auth/auth-code-grant/request-authorization-code-url", () => ({
  requestAuthorizationCodeUrl: jest.fn().mockReturnValue(unitTestDefraId),
}));

jest.mock("../../../../app/api-requests/contact-history-api");

const getEncodedTestState = async (server, { invalid } = { invalid: false }) => {
  const rawState = {
    id: randomUUID(),
    source: "dashboard",
  };
  const encodedState = Buffer.from(JSON.stringify(rawState)).toString("base64");

  const crn = "1100021396";
  const nonce = "f0b70cd8-12a6-4e4e-a664-64bd7888b0d9";

  const state = {
    tokens: {
      nonce,
      state: encodedState,
    },
    pkcecodes: {
      verifier: "wsfnhWoz2TP5eg9n7-qLgr83XB4IJWUdZ9e6RZrlOTI",
    },
    customer: {
      crn,
    },
  };
  await setServerState(server, state);

  if (invalid) {
    const rawState = {
      id: randomUUID(),
      source: "dashboard",
    };
    const differentEncodedState = Buffer.from(JSON.stringify(rawState)).toString("base64");

    return differentEncodedState;
  }

  return encodedState;
};

describe("signin-oidc", () => {
  let server;

  beforeAll(async () => {
    server = await createServer();
  });

  test("validation on request has failed, return 400", async () => {
    const res = await server.inject({
      url: "/signin-oidc",
      auth: {
        credentials: {},
        strategy: "cookie",
      },
    });

    expect(res.statusCode).toBe(StatusCodes.BAD_REQUEST);
  });

  test("state is not valid, 302 redirect user to defra id", async () => {
    const invalidEncodedState = await getEncodedTestState(server, { invalid: true });

    const res = await server.inject({
      url: `/signin-oidc?state=${invalidEncodedState}&code=123`,
      auth: {
        credentials: {},
        strategy: "cookie",
      },
    });

    expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY);
    expect(res.headers.location).toBe(unitTestDefraId);
  });

  test("happy path", async () => {
    const encodedState = await getEncodedTestState(server);

    jest
      .spyOn(authModule, "authenticate")
      .mockResolvedValue({ accessToken: "access-token", authRedirectCallback: undefined });
    jest.spyOn(apimModule, "retrieveApimAccessToken").mockResolvedValue("Bearer abc123");
    jest.spyOn(personAndOrgModule, "getPersonAndOrg").mockResolvedValue(mockOrgAndPerson);
    jest
      .spyOn(checkLoginValidModule, "checkLoginValid")
      .mockResolvedValue({ redirectPath: "/the-happy-path", redirectCallback: undefined });

    const res = await server.inject({
      url: `/signin-oidc?state=${encodedState}&code=123`,
      auth: {
        credentials: {},
        strategy: "cookie",
      },
    });

    expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY);
    expect(res.headers.location).toBe("/the-happy-path");
  });

  test("user is not eligible to sign in, show the error page", async () => {
    const encodedState = await getEncodedTestState(server);

    const lockedOrgAndPerson = { ...mockOrgAndPerson };
    lockedOrgAndPerson.orgDetails.organisation.locked = true;

    jest
      .spyOn(authModule, "authenticate")
      .mockResolvedValue({ accessToken: "access-token", authRedirectCallback: undefined });
    jest.spyOn(apimModule, "retrieveApimAccessToken").mockResolvedValue("Bearer abc123");
    jest.spyOn(personAndOrgModule, "getPersonAndOrg").mockResolvedValue(lockedOrgAndPerson);
    jest.spyOn(cphCheckModule, "customerHasAtLeastOneValidCph").mockResolvedValue(true);

    const res = await server.inject({
      url: `/signin-oidc?state=${encodedState}&code=123`,
      auth: {
        credentials: {},
        strategy: "cookie",
      },
    });

    expect(res.statusCode).toBe(StatusCodes.MOVED_TEMPORARILY);
    expect(res.headers.location).toEqual("/cannot-sign-in");
  });

  test("something unexpectedly throws an error, return 500", async () => {
    const encodedState = await getEncodedTestState(server);

    jest
      .spyOn(authModule, "authenticate")
      .mockImplementation()
      .mockRejectedValue(new Error("Boom!"));

    const res = await server.inject({
      url: `/signin-oidc?state=${encodedState}&code=123`,
      auth: {
        credentials: {},
        strategy: "cookie",
      },
    });

    expect(res.statusCode).toBe(StatusCodes.INTERNAL_SERVER_ERROR);
  });
});

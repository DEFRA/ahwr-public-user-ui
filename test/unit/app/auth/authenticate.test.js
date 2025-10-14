import HttpStatus from "http-status-codes";
import wreck from "@hapi/wreck";
import jwktopem from "jwk-to-pem";
import { verifyState } from "../../../../app/auth/auth-code-grant/state.js";
import { authenticate } from "../../../../app/auth/authenticate";
import {
  getSessionData,
  setSessionData,
  sessionKeys,
  sessionEntryKeys,
} from "../../../../app/session/index.js";
import { verify } from "jsonwebtoken";
import { authConfig } from "../../../../app/config/auth.js";
import { when, resetAllWhenMocks } from "jest-when";

const MOCK_NOW = new Date();

jest.mock("../../../../app/session");
jest.mock("@hapi/wreck");
jest.mock("jwk-to-pem");

jest.mock("jsonwebtoken", () => ({
  verify: jest.fn().mockReturnValue(true),
  decode: jest.requireActual("jsonwebtoken").decode,
}));

jest.mock("../../../../app/auth/auth-code-grant/state.js", () => ({
  verifyState: jest.fn(),
}));

jest.mock("applicationinsights", () => ({
  defaultClient: { trackException: jest.fn(), trackEvent: () => "hello" },
  dispose: jest.fn(),
}));

jest.mock("../../../../app/config/auth.js", () => ({
  authConfig: {
    defraId: {
      hostname: "https://tenantname.b2clogin.com/tenantname.onmicrosoft.com",
      tenantName: "tenantname",
      oAuthAuthorisePath: "/oauth2/v2.0/authorize",
      policy: "b2c_1a_signupsigninsfi",
      redirectUri: "/signin-oidc",
      clientId: "dummy_client_id",
      clientSecret: "dummy_client_secret",
      serviceId: "dummy_service_id",
      scope: "openid dummy_client_id offline_access",
      jwtIssuerId: "jwtissuerid",
    },
  },
}));

describe("authenticate", () => {
  beforeAll(() => {
    jest.useFakeTimers("modern");
    jest.setSystemTime(MOCK_NOW);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    resetAllWhenMocks();
  });

  test.each([
    {
      toString: () => "authenticate",
      given: {
        request: {
          query: {
            state: "eyJpZCI6IjgyN2E0NmEyLTEzZGQtNGI4MC04MzM1LWQxZDZhNTVlNmY3MSJ9",
            code: "query_code",
          },
          logger: {
            log: jest.fn(),
            error: jest.fn(),
            setBindings: jest.fn(),
          },
        },
      },
      when: {
        session: {
          state: "eyJpZCI6IjgyN2E0NmEyLTEzZGQtNGI4MC04MzM1LWQxZDZhNTVlNmY3MSJ9",
          pkcecodes: {
            verifier: "verifier",
          },
        },
        jwktopem: "public_key",
        acquiredSigningKey: {
          signingKey: "signing_key",
        },
        redeemResponse: {
          res: {
            statusCode: HttpStatus.OK,
          },
          payload: {
            access_token: {
              sub: "1234567890",
              name: "John Doe",
              firstName: "John",
              lastName: "Doe",
              email: "john.doe@email.com",
              iat: 1516239022,
              iss: `https://${authConfig.defraId.tenantName}.b2clogin.com/${authConfig.defraId.jwtIssuerId}/v2.0/`,
              roles: ["5384769:Agent:3"],
              contactId: "1234567890",
              currentRelationshipId: "123456789",
            },
            id_token: {
              sub: "1234567890",
              name: "John Doe",
              iat: 1516239022,
              nonce: "123",
            },
            expires_in: 10,
          },
        },
      },
      expect: {
        error: undefined,
      },
    },
    {
      toString: () => "authenticate - iss not trusted",
      given: {
        request: {
          query: {
            state: "eyJpZCI6IjgyN2E0NmEyLTEzZGQtNGI4MC04MzM1LWQxZDZhNTVlNmY3MSJ9",
            code: "query_code",
          },
          logger: {
            log: jest.fn(),
            error: jest.fn(),
            setBindings: jest.fn(),
          },
        },
      },
      when: {
        session: {
          state: "eyJpZCI6IjgyN2E0NmEyLTEzZGQtNGI4MC04MzM1LWQxZDZhNTVlNmY3MSJ9",
          pkcecodes: {
            verifier: "verifier",
          },
        },
        jwktopem: "public_key",
        acquiredSigningKey: {
          signingKey: "signing_key",
        },
        redeemResponse: {
          res: {
            statusCode: HttpStatus.OK,
          },
          payload: {
            access_token: {
              sub: "1234567890",
              name: "John Doe",
              firstName: "John",
              lastName: "Doe",
              email: "john.doe@email.com",
              iat: 1516239022,
              iss: "https://tenantname.b2clogin.com/WRONG_JWT_ISSUER_ID/v2.0/",
              roles: ["5384769:Agent:3"],
              contactId: "1234567890",
              currentRelationshipId: "123456789",
            },
            id_token: {
              sub: "1234567890",
              name: "John Doe",
              iat: 1516239022,
              nonce: "123",
            },
            expires_in: 10,
          },
        },
      },
      expect: {
        error: new Error(
          "Issuer not trusted: https://tenantname.b2clogin.com/WRONG_JWT_ISSUER_ID/v2.0/",
        ),
      },
    },
    {
      toString: () => "authenticate - jwtVerify error",
      given: {
        request: {
          query: {
            state: "eyJpZCI6IjgyN2E0NmEyLTEzZGQtNGI4MC04MzM1LWQxZDZhNTVlNmY3MSJ9",
            code: "query_code",
          },
          logger: {
            log: jest.fn(),
            error: jest.fn(),
            setBindings: jest.fn(),
          },
        },
      },
      when: {
        session: {
          state: "eyJpZCI6IjgyN2E0NmEyLTEzZGQtNGI4MC04MzM1LWQxZDZhNTVlNmY3MSJ9",
          pkcecodes: {
            verifier: "verifier",
          },
        },
        jwktopem: "WRONG_KEY!!!",
        acquiredSigningKey: {
          signingKey: "signing_key",
        },
        redeemResponse: {
          res: {
            statusCode: HttpStatus.OK,
          },
          payload: {
            access_token: {
              sub: "1234567890",
              name: "John Doe",
              firstName: "John",
              lastName: "Doe",
              email: "john.doe@email.com",
              iat: 1516239022,
              iss: "https://tenantname.b2clogin.com/WRONG_JWT_ISSUER_ID/v2.0/",
              roles: ["5384769:Agent:3"],
              contactId: "1234567890",
              currentRelationshipId: "123456789",
            },
            id_token: {
              sub: "1234567890",
              name: "John Doe",
              iat: 1516239022,
              nonce: "123",
            },
            expires_in: 10,
          },
        },
      },
      expect: {
        error: new Error("The token has not been verified"),
      },
    },
  ])("%s", async (testCase) => {
    if (testCase.toString().includes("jwtVerify error")) {
      verify.mockReturnValue(null);
    } else {
      verify.mockReturnValueOnce(testCase.when.redeemResponse.payload.access_token);
      verify.mockReturnValueOnce(testCase.when.redeemResponse.payload.id_token);
      verifyState.mockReturnValue(true);
    }

    when(getSessionData)
      .calledWith(testCase.given.request, sessionEntryKeys.tokens, sessionKeys.tokens.state)
      .mockReturnValue(testCase.when.state);
    when(getSessionData)
      .calledWith(
        testCase.given.request,
        sessionEntryKeys.pkcecodes,
        sessionKeys.pkcecodes.verifier,
      )
      .mockReturnValue(testCase.when.session.pkcecodes.verifier);
    when(wreck.post)
      .calledWith(expect.stringContaining("token"), {
        headers: expect.anything(),
        payload: expect.anything(),
        json: true,
      })
      .mockResolvedValue(testCase.when.redeemResponse);
    when(wreck.get)
      .calledWith(expect.stringContaining("keys"), { json: true })
      .mockResolvedValue({
        res: {
          statusCode: HttpStatus.OK,
        },
        payload: {
          keys: [testCase.when.acquiredSigningKey],
        },
      });
    when(jwktopem)
      .calledWith(testCase.when.acquiredSigningKey)
      .mockReturnValue(testCase.when.jwktopem);
    when(getSessionData)
      .calledWith(testCase.given.request, sessionEntryKeys.tokens, sessionKeys.tokens.nonce)
      .mockReturnValue("123");

    if (testCase.expect.error) {
      await expect(authenticate(testCase.given.request)).rejects.toEqual(testCase.expect.error);

      expect(setSessionData).toHaveBeenCalledTimes(0);
    } else {
      await authenticate(testCase.given.request);

      expect(setSessionData).toHaveBeenCalledWith(
        testCase.given.request,
        sessionEntryKeys.tokens,
        sessionKeys.tokens.accessToken,
        testCase.when.redeemResponse.payload.access_token,
      );
      expect(setSessionData).toHaveBeenCalledWith(
        testCase.given.request,
        sessionEntryKeys.customer,
        sessionKeys.customer.crn,
        "1234567890",
      );
      expect(setSessionData).toHaveBeenCalledWith(
        testCase.given.request,
        sessionEntryKeys.customer,
        sessionKeys.customer.organisationId,
        "123456789",
      );
      expect(setSessionData).toHaveBeenCalledWith(
        testCase.given.request,
        sessionEntryKeys.customer,
        sessionKeys.customer.attachedToMultipleBusinesses,
        false,
      );
    }
  });
});

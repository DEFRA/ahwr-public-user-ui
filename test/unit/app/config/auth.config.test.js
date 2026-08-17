import { getAuthConfig } from "../../../../app/config/auth.js";

describe("Auth config", () => {
  const env = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...env };
  });

  test.each([
    {
      processEnv: {
        tenant: "testtenant",
        policy: "testpolicy",
        redirectUri: "http://localhost:3003/signin-oidc",
        jwtIssuerId: "dummy_jwt_issuer_id",
        clientId: "dummyclientid",
        clientSecret: "dummyclientsecret",
        serviceId: "dummyserviceid",
        redirectHosts: "https://testtenant.b2clogin.com,https://your-account.example.gov.uk",
        rpaHostname: "dummy-host-name",
        rpaGetPersonSummaryUrl: "dummy-get-person-summary-url",
        rpaGetOrganisationPermissionsUrl: "dummy-get-organisation-permissions-url",
        rpaGetOrganisationUrl: "dummy-get-organisation-url",
        rpaGetCphNumbersUrl: "dummy-get-cph-numbers-url",
        apimOcpSubscriptionKey: "dummy-ocp-subscription-key",
        apimHostname: "dummy-host-name",
        apimOAuthPath: "dummy-oauth-path",
        apimClientId: "dummy-client-id",
        apimClientSecret: "dummy-client-secret",
        apimScope: "dummy-scope",
      },
      config: {
        defraId: {
          hostname: "https://testtenant.b2clogin.com/testtenant.onmicrosoft.com",
          oAuthAuthorisePath: "/oauth2/v2.0/authorize",
          policy: "testpolicy",
          redirectUri: "http://localhost:3003/signin-oidc",
          tenantName: "testtenant",
          jwtIssuerId: "dummy_jwt_issuer_id",
          clientId: "dummyclientid",
          clientSecret: "dummyclientsecret",
          serviceId: "dummyserviceid",
          scope: "openid dummyclientid offline_access",
          redirectHosts: ["https://testtenant.b2clogin.com", "https://your-account.example.gov.uk"],
        },
        ruralPaymentsAgency: {
          hostname: "dummy-host-name",
          getPersonSummaryUrl: "dummy-get-person-summary-url",
          getOrganisationPermissionsUrl: "dummy-get-organisation-permissions-url",
          getOrganisationUrl: "dummy-get-organisation-url",
          getCphNumbersUrl: "dummy-get-cph-numbers-url",
        },
        apim: {
          ocpSubscriptionKey: "dummy-ocp-subscription-key",
          hostname: "dummy-host-name",
          oAuthPath: "dummy-oauth-path",
          clientId: "dummy-client-id",
          clientSecret: "dummy-client-secret",
          scope: "dummy-scope",
        },
      },
    },
  ])("GIVEN $processEnv EXPECT $config", (testCase) => {
    process.env.DEFRA_ID_TENANT = testCase.processEnv.tenant;
    process.env.DEFRA_ID_POLICY = testCase.processEnv.policy;
    process.env.DEFRA_ID_REDIRECT_URI = testCase.processEnv.redirectUri;
    process.env.DEFRA_ID_JWT_ISSUER_ID = testCase.processEnv.jwtIssuerId;
    process.env.DEFRA_ID_CLIENT_ID = testCase.processEnv.clientId;
    process.env.DEFRA_ID_CLIENT_SECRET = testCase.processEnv.clientSecret;
    process.env.DEFRA_ID_SERVICE_ID = testCase.processEnv.serviceId;
    process.env.DEFRA_ID_REDIRECT_HOSTS = testCase.processEnv.redirectHosts;
    process.env.RPA_HOST_NAME = testCase.processEnv.rpaHostname;
    process.env.RPA_GET_PERSON_SUMMARY_URL = testCase.processEnv.rpaGetPersonSummaryUrl;
    process.env.RPA_GET_ORGANISATION_PERMISSIONS_URL =
      testCase.processEnv.rpaGetOrganisationPermissionsUrl;
    process.env.RPA_GET_ORGANISATION_URL = testCase.processEnv.rpaGetOrganisationUrl;
    process.env.RPA_GET_CPH_NUMBERS_URL = testCase.processEnv.rpaGetCphNumbersUrl;
    process.env.APIM_OCP_SUBSCRIPTION_KEY = testCase.processEnv.apimOcpSubscriptionKey;
    process.env.APIM_HOST_NAME = testCase.processEnv.apimHostname;
    process.env.APIM_OAUTH_PATH = testCase.processEnv.apimOAuthPath;
    process.env.APIM_CLIENT_ID = testCase.processEnv.apimClientId;
    process.env.APIM_CLIENT_SECRET = testCase.processEnv.apimClientSecret;
    process.env.APIM_SCOPE = testCase.processEnv.apimScope;

    const config = getAuthConfig();

    expect(config).toEqual(testCase.config);
  });

  test.each([
    {
      processEnv: {
        redirectUri: "not a uri",
      },
      errorMessage: 'The auth config is invalid. "defraId.redirectUri" must be a valid uri',
    },
  ])("GIVEN $processEnv EXPECT $errorMessage", (testCase) => {
    process.env.DEFRA_ID_REDIRECT_URI = testCase.processEnv.redirectUri;
    expect(() => getAuthConfig()).toThrow(testCase.errorMessage);
  });

  test("trims whitespace around the Defra ID redirect hosts", () => {
    process.env.DEFRA_ID_REDIRECT_HOSTS =
      " https://one.example.gov.uk , https://two.example.gov.uk ";

    expect(getAuthConfig().defraId.redirectHosts).toEqual([
      "https://one.example.gov.uk",
      "https://two.example.gov.uk",
    ]);
  });

  test("has no Defra ID redirect hosts when none are configured", () => {
    delete process.env.DEFRA_ID_REDIRECT_HOSTS;

    expect(getAuthConfig().defraId.redirectHosts).toEqual([]);
  });

  test("rejects a Defra ID redirect host that is missing its scheme", () => {
    process.env.DEFRA_ID_REDIRECT_HOSTS = "https://valid.example.gov.uk,dcidmtest.b2clogin.com";

    expect(() => getAuthConfig()).toThrow(
      'The auth config is invalid. "defraId.redirectHosts[1]" must be a valid uri',
    );
  });

  afterEach(() => {
    process.env = env;
  });
});

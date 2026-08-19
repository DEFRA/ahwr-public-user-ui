import convict from "convict";
import { convictValidateUri } from "./convict/validate-uri.js";
import { convictValidateArrayOfUrls } from "./convict/validate-array-of-urls.js";

convict.addFormat(convictValidateUri);
convict.addFormat(convictValidateArrayOfUrls);

export const getAuthConfig = () => {
  const defraIdTenant = process.env.DEFRA_ID_TENANT;
  const defraIdClientId = process.env.DEFRA_ID_CLIENT_ID;

  const authConfig = convict({
    defraId: {
      hostname: {
        doc: "DefraID B2C hostname",
        format: "uri",
        default: `https://${defraIdTenant}.b2clogin.com/${defraIdTenant}.onmicrosoft.com`,
      },
      oAuthAuthorisePath: {
        doc: "OAuth authorise path",
        format: String,
        default: "/oauth2/v2.0/authorize",
      },
      policy: {
        doc: "DefraID sign-in policy",
        format: String,
        nullable: true,
        default: null,
        env: "DEFRA_ID_POLICY",
      },
      redirectUri: {
        doc: "DefraID redirect URI",
        format: "uri",
        nullable: true,
        default: null,
        env: "DEFRA_ID_REDIRECT_URI",
      },
      tenantName: {
        doc: "DefraID tenant name",
        format: String,
        nullable: true,
        default: null,
        env: "DEFRA_ID_TENANT",
      },
      jwtIssuerId: {
        doc: "DefraID JWT issuer id",
        format: String,
        nullable: true,
        default: null,
        env: "DEFRA_ID_JWT_ISSUER_ID",
      },
      clientId: {
        doc: "DefraID client id",
        format: String,
        nullable: true,
        default: null,
        env: "DEFRA_ID_CLIENT_ID",
      },
      clientSecret: {
        doc: "DefraID client secret",
        format: String,
        nullable: true,
        default: null,
        sensitive: true,
        env: "DEFRA_ID_CLIENT_SECRET",
      },
      serviceId: {
        doc: "DefraID service id",
        format: String,
        nullable: true,
        default: null,
        env: "DEFRA_ID_SERVICE_ID",
      },
      scope: {
        doc: "DefraID OAuth scope",
        format: String,
        default: `openid ${defraIdClientId} offline_access`,
      },
      // Defra ID hands off from the B2C tenant to its branded front door, so both hosts appear in the sign-in redirect chain
      redirectHosts: {
        doc: "Allowed DefraID redirect hosts",
        format: "array-of-urls",
        default: (process.env.DEFRA_ID_REDIRECT_HOSTS ?? "")
          .split(",")
          .map((host) => host.trim())
          .filter(Boolean),
      },
    },
    ruralPaymentsAgency: {
      hostname: {
        doc: "RPA hostname",
        format: String,
        nullable: true,
        default: null,
        env: "RPA_HOST_NAME",
      },
      getPersonSummaryUrl: {
        doc: "RPA person summary URL",
        format: String,
        nullable: true,
        default: null,
        env: "RPA_GET_PERSON_SUMMARY_URL",
      },
      getOrganisationPermissionsUrl: {
        doc: "RPA organisation permissions URL",
        format: String,
        nullable: true,
        default: null,
        env: "RPA_GET_ORGANISATION_PERMISSIONS_URL",
      },
      getOrganisationUrl: {
        doc: "RPA organisation URL",
        format: String,
        nullable: true,
        default: null,
        env: "RPA_GET_ORGANISATION_URL",
      },
      getCphNumbersUrl: {
        doc: "RPA CPH numbers URL",
        format: String,
        nullable: true,
        default: null,
        env: "RPA_GET_CPH_NUMBERS_URL",
      },
    },
    apim: {
      hostname: {
        doc: "APIM hostname",
        format: String,
        nullable: true,
        default: null,
        env: "APIM_HOST_NAME",
      },
      oAuthPath: {
        doc: "APIM OAuth path",
        format: String,
        nullable: true,
        default: null,
        env: "APIM_OAUTH_PATH",
      },
      clientId: {
        doc: "APIM client id",
        format: String,
        nullable: true,
        default: null,
        env: "APIM_CLIENT_ID",
      },
      clientSecret: {
        doc: "APIM client secret",
        format: String,
        nullable: true,
        default: null,
        sensitive: true,
        env: "APIM_CLIENT_SECRET",
      },
      scope: {
        doc: "APIM scope",
        format: String,
        nullable: true,
        default: null,
        env: "APIM_SCOPE",
      },
      ocpSubscriptionKey: {
        doc: "APIM OCP subscription key",
        format: String,
        nullable: true,
        default: null,
        sensitive: true,
        env: "APIM_OCP_SUBSCRIPTION_KEY",
      },
    },
  });

  authConfig.validate({ allowed: "strict" });

  return authConfig;
};

export const authConfig = getAuthConfig();

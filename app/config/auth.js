import joi from "joi";

export const getAuthConfig = () => {
  const authSchema = joi.object({
    defraId: {
      hostname: joi.string().uri(),
      oAuthAuthorisePath: joi.string(),
      policy: joi.string(),
      redirectUri: joi.string().uri(),
      tenantName: joi.string(),
      jwtIssuerId: joi.string(),
      clientId: joi.string(),
      clientSecret: joi.string(),
      serviceId: joi.string(),
      scope: joi.string(),
    },
    ruralPaymentsAgency: {
      hostname: joi.string(),
      getPersonSummaryUrl: joi.string(),
      getOrganisationPermissionsUrl: joi.string(),
      getOrganisationUrl: joi.string(),
      getCphNumbersUrl: joi.string(),
    },
    apim: {
      hostname: joi.string(),
      oAuthPath: joi.string(),
      clientId: joi.string(),
      clientSecret: joi.string(),
      scope: joi.string(),
      ocpSubscriptionKey: joi.string(),
    },
  });

  const authConfig = {
    defraId: {
      hostname: `https://${process.env.DEFRA_ID_TENANT}.b2clogin.com/${process.env.DEFRA_ID_TENANT}.onmicrosoft.com`,
      oAuthAuthorisePath: "/oauth2/v2.0/authorize",
      policy: process.env.DEFRA_ID_POLICY,
      redirectUri: process.env.DEFRA_ID_REDIRECT_URI,
      tenantName: process.env.DEFRA_ID_TENANT,
      jwtIssuerId: process.env.DEFRA_ID_JWT_ISSUER_ID,
      clientId: process.env.DEFRA_ID_CLIENT_ID,
      clientSecret: process.env.DEFRA_ID_CLIENT_SECRET,
      serviceId: process.env.DEFRA_ID_SERVICE_ID,
      scope: `openid ${process.env.DEFRA_ID_CLIENT_ID} offline_access`,
    },
    ruralPaymentsAgency: {
      hostname: process.env.RPA_HOST_NAME,
      getPersonSummaryUrl: process.env.RPA_GET_PERSON_SUMMARY_URL,
      getOrganisationPermissionsUrl: process.env.RPA_GET_ORGANISATION_PERMISSIONS_URL,
      getOrganisationUrl: process.env.RPA_GET_ORGANISATION_URL,
      getCphNumbersUrl: process.env.RPA_GET_CPH_NUMBERS_URL,
    },
    apim: {
      hostname: process.env.APIM_HOST_NAME,
      oAuthPath: process.env.APIM_OAUTH_PATH,
      clientId: process.env.APIM_CLIENT_ID,
      clientSecret: process.env.APIM_CLIENT_SECRET,
      scope: process.env.APIM_SCOPE,
      ocpSubscriptionKey: process.env.APIM_OCP_SUBSCRIPTION_KEY,
    },
  };

  const authResult = authSchema.validate(authConfig, {
    abortEarly: false,
  });

  if (authResult.error) {
    throw new Error(`The auth config is invalid. ${authResult.error.message}`);
  }

  return authConfig;
};

export const authConfig = getAuthConfig();

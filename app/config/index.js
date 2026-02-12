import joi from "joi";
import {
  applicationApiConfig,
  applicationApiConfigSchema,
} from "../api-requests/application-api.config.js";

const SECONDS_IN_HOUR = 3600;
const HOURS_IN_DAY = 24;
const DAYS_IN_YEAR = 365;
const MS_IN_SECOND = 1000;
const THREE = 3;
const threeDaysInMs = MS_IN_SECOND * SECONDS_IN_HOUR * HOURS_IN_DAY * THREE;
const oneYearInMs = MS_IN_SECOND * SECONDS_IN_HOUR * HOURS_IN_DAY * DAYS_IN_YEAR;
const defaultApiKey = "c19fcb0d-a6d2-4d9e-9325-16d44ddc0724";

const configSchema = joi.object({
  namespace: joi.string().optional(),
  cache: {
    expiresIn: joi.number().required(),
    name: joi.string().required(),
    options: {
      host: joi.string(),
      keyPrefix: joi.string(),
      username: joi.string().allow(""),
      password: joi.string().allow(""),
      useSingleInstanceCache: joi.boolean(),
      useTLS: joi.boolean(),
    },
  },
  apiKeys: {
    applicationBackendApiKey: joi.string().required,
  },
  cookie: {
    cookieNameCookiePolicy: joi.string(),
    cookieNameAuth: joi.string(),
    cookieNameSession: joi.string(),
    isSameSite: [joi.string(), joi.bool()],
    isSecure: joi.boolean(),
    password: joi.string().min(32).required(),
    ttl: joi.number().required(),
  },
  cookiePolicy: {
    clearInvalid: joi.bool(),
    encoding: joi.string().valid("base64json"),
    isSameSite: [joi.string(), joi.bool()],
    isSecure: joi.bool(),
    password: joi.string().min(32).required(),
    path: joi.string().default("/"),
    ttl: joi.number().required(),
  },
  env: joi.string().valid("development", "test", "production").default("development"),
  displayPageSize: joi.number().required(),
  googleTagManagerKey: joi.string().allow(null, ""),
  isDev: joi.boolean(),
  isMetricsEnabled: joi.boolean(),
  applicationApiUri: joi.string().uri(),
  port: joi.number().required(),
  host: joi.string().required(),
  proxy: joi.string().optional(),
  serviceUri: joi.string().uri(),
  serviceName: joi.string(),
  useRedis: joi.boolean(),
  customerSurvey: {
    claimUri: joi.string().uri().required(),
    applyUri: joi.string().uri().required(),
  },
  applicationApi: applicationApiConfigSchema,
  wreckHttp: {
    timeoutMilliseconds: joi.number().required(),
  },
  multiSpecies: joi.object({
    releaseDate: joi.string().required(),
  }),
  devLogin: {
    enabled: joi.bool().required(),
  },
  latestTermsAndConditionsUri: joi.string().required(),
  reapplyTimeLimitMonths: joi.number(),
  multiHerds: joi.object({
    releaseDate: joi.string().required(),
  }),
  privacyPolicyUri: joi.string().uri(),
  lfsUpdate: {
    enabled: joi.boolean(),
    uri: joi.string().uri().optional(),
  },
  serviceVersion: joi.string().required(),
  name: joi.string().required(),
  logLevel: joi.string().required(),
  logFormat: joi.string().required(),
  logRedact: joi.array().items(joi.string()),
  fcpMessaging: joi.object({
    host: joi.string().required(),
    username: joi.string().required(),
    password: joi.string().required(),
    address: joi.string().required(),
  }),
  documentBucketName: joi.string().required(),
  awsRegion: joi.string().required(),
});

export const getConfig = () => {
  const builtConfig = {
    namespace: process.env.NAMESPACE,
    cache: {
      expiresIn: threeDaysInMs,
      name: "session",
      options: {
        host: process.env.REDIS_HOST || "redis-hostname.default",
        keyPrefix: process.env.REDIS_KEY_PREFIX || "ahwr-public-user-ui:",
        username: process.env.REDIS_USERNAME,
        password: process.env.REDIS_PASSWORD,
        useSingleInstanceCache: process.env.NODE_ENV !== "production",
        useTLS: process.env.NODE_ENV === "production",
      },
    },
    apiKeys: {
      applicationBackendApiKey: {
        doc: "Api key for the application backend",
        format: String,
        default: defaultApiKey,
        sensitive: true,
        env: "APPLICATION_BACKEND_API_KEY",
      },
    },
    cookie: {
      cookieNameCookiePolicy: "ahwr_cookie_policy",
      cookieNameAuth: "ahwr_auth",
      cookieNameSession: "ahwr_session",
      isSameSite: process.env.DISABLE_COOKIE_SAME_SITE === "true" ? false : "Lax",
      isSecure: process.env.NODE_ENV === "production",
      password: process.env.COOKIE_PASSWORD,
      ttl: threeDaysInMs,
    },
    cookiePolicy: {
      clearInvalid: false,
      encoding: "base64json",
      isSameSite: process.env.DISABLE_COOKIE_SAME_SITE === "true" ? false : "Lax",
      isSecure: process.env.NODE_ENV === "production",
      password: process.env.COOKIE_PASSWORD,
      ttl: oneYearInMs,
    },
    env: process.env.NODE_ENV,
    displayPageSize: Number.parseInt(process.env.DISPLAY_PAGE_SIZE ?? "20", 10),
    googleTagManagerKey: process.env.GOOGLE_TAG_MANAGER_KEY,
    isDev: process.env.NODE_ENV === "development",
    isMetricsEnabled: process.env.NODE_ENV === "production",
    applicationApiUri: process.env.APPLICATION_API_URI,
    port: Number.parseInt(process.env.PORT ?? "3000", 10),
    host: "0.0.0.0",
    proxy: process.env.HTTP_PROXY,
    serviceUri: process.env.SERVICE_URI ?? "http://localhost:3000/",
    useRedis: process.env.NODE_ENV !== "test",
    serviceName: "Get funding to improve animal health and welfare",
    customerSurvey: {
      claimUri: process.env.CUSTOMER_SURVEY_CLAIM_URI ?? "https://forms.office.com/e/SLKqfJQ499",
      applyUri: process.env.CUSTOMER_SURVEY_APPLY_URI ?? "https://forms.office.com/e/4frXv6SqvR",
    },
    applicationApi: applicationApiConfig,
    wreckHttp: {
      timeoutMilliseconds: Number.parseInt(
        process.env.WRECK_HTTP_TIMEOUT_MILLISECONDS ?? "10000",
        10,
      ),
    },
    multiSpecies: {
      releaseDate: process.env.MULTI_SPECIES_RELEASE_DATE || "2024-12-06",
    },
    devLogin: {
      enabled: process.env.DEV_LOGIN_ENABLED === "true",
    },
    latestTermsAndConditionsUri: process.env.TERMS_AND_CONDITIONS_URL,
    reapplyTimeLimitMonths: 10,
    multiHerds: {
      releaseDate: process.env.MULTI_HERDS_RELEASE_DATE || "2025-05-01",
    },
    privacyPolicyUri: process.env.PRIVACY_POLICY_URI,
    lfsUpdate: {
      enabled: process.env.LFS_UPDATE_ENABLED === "true",
      uri: process.env.LFS_UPDATE_URI,
    },
    serviceVersion: process.env.SERVICE_VERSION ?? "1.0.0",
    name: process.env.SERVICE_NAME ?? "ahwr-public-user-ui",
    logLevel: process.env.LOG_LEVEL ?? (process.env.NODE_ENV === "test" ? "silent" : "info"),
    logFormat: process.env.USE_PRETTY_PRINT === "true" ? "pino-pretty" : "ecs",
    logRedact: process.env.LOG_REDACT
      ? process.env.LOG_REDACT.split(",")
      : ["req.headers", "res.headers"],
    fcpMessaging: {
      host: process.env.MESSAGE_QUEUE_HOST,
      username: process.env.MESSAGE_QUEUE_USER,
      password: process.env.FCP_AHWR_EVENT_QUEUE_SA_KEY,
      address: process.env.EVENT_QUEUE_ADDRESS,
    },
    documentBucketName: process.env.DOCUMENT_BUCKET_NAME,
    awsRegion: process.env.AWS_REGION,
  };

  const { error } = configSchema.validate(builtConfig, {
    abortEarly: false,
  });

  if (error) {
    throw new Error(`The server config is invalid. ${error.message}`);
  }

  return builtConfig;
};

export const config = getConfig();

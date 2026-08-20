import convict from "convict";
import { convictValidateUri } from "./convict/validate-uri.js";
import { convictValidateCookiePassword } from "./convict/validate-cookie-password.js";

convict.addFormat(convictValidateUri);
convict.addFormat(convictValidateCookiePassword);

const SECONDS_IN_HOUR = 3600;
const HOURS_IN_DAY = 24;
const DAYS_IN_YEAR = 365;
const MS_IN_SECOND = 1000;
const oneYearInMs = MS_IN_SECOND * SECONDS_IN_HOUR * HOURS_IN_DAY * DAYS_IN_YEAR;
const defaultApiKey = "c19fcb0d-a6d2-4d9e-9325-16d44ddc0724";

const poultryGuidanceUri =
  "https://www.gov.uk/guidance/poultry-biosecurity-review-funding-guidance-for-poultry-keepers-and-vets#how-to-have-a-poultry-biosecurity-review";

export const getConfig = () => {
  const isProduction = process.env.NODE_ENV === "production";
  const isTest = process.env.NODE_ENV === "test";
  const isSameSite = process.env.DISABLE_COOKIE_SAME_SITE === "true" ? false : "Lax";

  const config = convict({
    namespace: {
      doc: "Namespace for the service",
      format: String,
      nullable: true,
      default: null,
      env: "NAMESPACE",
    },
    cache: {
      expiresIn: {
        doc: "Session cache TTL in milliseconds",
        format: Number,
        default: null,
        env: "SESSION_TIMEOUT_MILLISECONDS",
      },
      name: {
        doc: "Cache segment name",
        format: String,
        default: "session",
      },
      options: {
        host: {
          doc: "Redis host",
          format: String,
          default: "redis-hostname.default",
          env: "REDIS_HOST",
        },
        keyPrefix: {
          doc: "Redis key prefix",
          format: String,
          default: "ahwr-public-user-ui:",
          env: "REDIS_KEY_PREFIX",
        },
        username: {
          doc: "Redis username",
          format: String,
          nullable: true,
          default: null,
          env: "REDIS_USERNAME",
        },
        password: {
          doc: "Redis password",
          format: String,
          nullable: true,
          default: null,
          sensitive: true,
          env: "REDIS_PASSWORD",
        },
        useSingleInstanceCache: {
          doc: "Use a single Redis instance rather than a cluster",
          format: Boolean,
          default: !isProduction,
        },
        useTLS: {
          doc: "Connect to Redis over TLS",
          format: Boolean,
          default: isProduction,
        },
      },
    },
    apiKeys: {
      publicUiBackendApiKey: {
        doc: "Api key for the public ui backend",
        format: String,
        default: defaultApiKey,
        sensitive: true,
        env: "PUBLIC_UI_API_KEY",
      },
    },
    cookie: {
      cookieNameCookiePolicy: {
        doc: "Cookie policy cookie name",
        format: String,
        default: "ahwr_cookie_policy",
      },
      cookieNameAuth: {
        doc: "Auth cookie name",
        format: String,
        default: "ahwr_auth",
      },
      cookieNameSession: {
        doc: "Session cookie name",
        format: String,
        default: "ahwr_session",
      },
      isSameSite: {
        doc: "SameSite cookie attribute (or false to disable)",
        format: "*",
        default: isSameSite,
      },
      isSecure: {
        doc: "Set the Secure flag on cookies",
        format: Boolean,
        default: isProduction,
      },
      password: {
        doc: "Cookie encryption password (min 32 chars)",
        format: "cookie-password",
        default: null,
        sensitive: true,
        env: "COOKIE_PASSWORD",
      },
      ttl: {
        doc: "Session cookie TTL in milliseconds",
        format: Number,
        default: null,
        env: "SESSION_TIMEOUT_MILLISECONDS",
      },
    },
    cookiePolicy: {
      clearInvalid: {
        doc: "Clear invalid cookies",
        format: Boolean,
        default: false,
      },
      encoding: {
        doc: "Cookie encoding",
        format: ["base64json"],
        default: "base64json",
      },
      isSameSite: {
        doc: "SameSite cookie attribute (or false to disable)",
        format: "*",
        default: isSameSite,
      },
      isSecure: {
        doc: "Set the Secure flag on the cookie policy cookie",
        format: Boolean,
        default: isProduction,
      },
      password: {
        doc: "Cookie policy encryption password (min 32 chars)",
        format: "cookie-password",
        default: null,
        sensitive: true,
        env: "COOKIE_PASSWORD",
      },
      path: {
        doc: "Cookie policy path",
        format: String,
        default: "/",
      },
      ttl: {
        doc: "Cookie policy TTL in milliseconds",
        format: Number,
        default: oneYearInMs,
      },
    },
    googleTagManagerKey: {
      doc: "Google Tag Manager key",
      format: String,
      nullable: true,
      default: null,
      env: "GOOGLE_TAG_MANAGER_KEY",
    },
    isDev: {
      doc: "Running in development",
      format: Boolean,
      default: process.env.NODE_ENV === "development",
    },
    isLocal: {
      doc: "Running locally (disables view caching)",
      format: Boolean,
      default: false,
    },
    isMetricsEnabled: {
      doc: "Enable metrics reporting",
      format: Boolean,
      default: isProduction,
    },
    isAuditEventEnabled: {
      doc: "Enable audit events",
      format: Boolean,
      default: (process.env.ENABLE_AUDIT_EVENTS ?? "true") === "true",
    },
    applicationApiUri: {
      doc: "Application backend API URI",
      format: "uri",
      default: null,
      env: "APPLICATION_API_URI",
    },
    port: {
      doc: "The port to bind",
      format: Number,
      default: 3000,
      env: "PORT",
    },
    host: {
      doc: "The IP address to bind",
      format: String,
      default: "0.0.0.0",
    },
    proxy: {
      doc: "HTTP proxy URL",
      format: String,
      nullable: true,
      default: null,
      env: "HTTP_PROXY",
    },
    serviceUri: {
      doc: "Public service URI",
      format: "uri",
      default: "http://localhost:3000/",
      env: "SERVICE_URI",
    },
    useRedis: {
      doc: "Use Redis for the session cache",
      format: Boolean,
      default: !isTest,
    },
    serviceName: {
      doc: "Service name shown in the UI",
      format: String,
      default: "Get funding to improve animal health and welfare",
    },
    customerSurvey: {
      claimUri: {
        doc: "Customer survey URI for the claim journey",
        format: "uri",
        default: "https://forms.office.com/e/SLKqfJQ499",
        env: "CUSTOMER_SURVEY_CLAIM_URI",
      },
      applyUri: {
        doc: "Customer survey URI for the apply journey",
        format: "uri",
        default: "https://forms.office.com/e/4frXv6SqvR",
        env: "CUSTOMER_SURVEY_APPLY_URI",
      },
    },
    wreckHttp: {
      timeoutMilliseconds: {
        doc: "Wreck HTTP request timeout in milliseconds",
        format: Number,
        default: 10000,
        env: "WRECK_HTTP_TIMEOUT_MILLISECONDS",
      },
    },
    devLogin: {
      enabled: {
        doc: "Enable the local dev login bypass",
        format: Boolean,
        default: process.env.DEV_LOGIN_ENABLED === "true",
      },
    },
    latestTermsAndConditionsUri: {
      doc: "Latest terms and conditions URI",
      format: String,
      default: null,
      env: "TERMS_AND_CONDITIONS_URL",
    },
    privacyPolicyUri: {
      doc: "Privacy policy URI",
      format: "uri",
      nullable: true,
      default: null,
      env: "PRIVACY_POLICY_URI",
    },
    lfsUpdate: {
      enabled: {
        doc: "Enable the LFS update banner",
        format: Boolean,
        default: process.env.LFS_UPDATE_ENABLED === "true",
      },
      uri: {
        doc: "LFS update URI",
        format: "uri",
        nullable: true,
        default: null,
        env: "LFS_UPDATE_URI",
      },
    },
    serviceVersion: {
      doc: "Service version",
      format: String,
      default: "1.0.0",
      env: "SERVICE_VERSION",
    },
    name: {
      doc: "Application name",
      format: String,
      default: "ahwr-public-user-ui",
      env: "SERVICE_NAME",
    },
    logLevel: {
      doc: "Logging level",
      format: String,
      default: isTest ? "silent" : "info",
      env: "LOG_LEVEL",
    },
    logFormat: {
      doc: "Log output format",
      format: String,
      default: process.env.USE_PRETTY_PRINT === "true" ? "pino-pretty" : "ecs",
    },
    logRedact: {
      doc: "Log paths to redact",
      format: Array,
      default: process.env.LOG_REDACT
        ? process.env.LOG_REDACT.split(",")
        : ["req.headers", "res.headers"],
    },
    fcpMessaging: {
      host: {
        doc: "Service bus host for FCP events",
        format: String,
        default: null,
        env: "MESSAGE_QUEUE_HOST",
      },
      username: {
        doc: "Service bus username",
        format: String,
        default: null,
        env: "MESSAGE_QUEUE_USER",
      },
      password: {
        doc: "Service bus password",
        format: String,
        default: null,
        sensitive: true,
        env: "FCP_AHWR_EVENT_QUEUE_SA_KEY",
      },
      address: {
        doc: "Service bus event queue address",
        format: String,
        default: null,
        env: "EVENT_QUEUE_ADDRESS",
      },
    },
    documentBucketName: {
      doc: "S3 bucket name for documents",
      format: String,
      default: null,
      env: "DOCUMENT_BUCKET_NAME",
    },
    awsRegion: {
      doc: "AWS region",
      format: String,
      default: null,
      env: "AWS_REGION",
    },
    tracing: {
      header: {
        doc: "CDP tracing header name",
        format: String,
        default: "x-cdp-request-id",
        env: "TRACING_HEADER",
      },
    },
    poultry: {
      termsAndConditionsUri: {
        doc: "Poultry terms and conditions URI",
        format: String,
        default: null,
        env: "POULTRY_TERMS_AND_CONDITIONS_URL",
      },
      vetSummaryTemplateUri: {
        doc: "Poultry vet summary template URI",
        format: String,
        default: null,
        env: "POULTRY_VET_SUMMARY_TEMPLATE_URL",
      },
      guidanceUri: {
        doc: "Poultry guidance URI",
        format: String,
        default: poultryGuidanceUri,
      },
      disableInterviewPage: {
        doc: "Disable the poultry interview page",
        format: Boolean,
        default: process.env.DISABLE_INTERVIEW_PAGE === "true",
      },
    },
  });

  config.validate({ allowed: "strict" });

  return config;
};

export const config = getConfig();

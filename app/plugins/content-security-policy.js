import Blankie from "blankie";
import { authConfig } from "../config/auth.js";

const GOOGLE_ANALYTICS = "*.google-analytics.com";
const GOOGLE_TAG_MANAGER = "*.googletagmanager.com";

// Session expiry redirects form submissions on to Defra ID, and form-action applies to the whole redirect chain
export const buildFormActionSources = ({ tenantName, hostname }) =>
  tenantName ? ["self", new URL(hostname).origin] : ["self"];

export const contentSecurityPolicyPlugin = {
  plugin: Blankie,
  options: {
    defaultSrc: ["self"],
    objectSrc: ["none"],
    scriptSrc: ["self", "www.google-analytics.com", GOOGLE_TAG_MANAGER],
    formAction: buildFormActionSources(authConfig.defraId),
    baseUri: ["self"],
    connectSrc: ["self", GOOGLE_ANALYTICS, "*.analytics.google.com", GOOGLE_TAG_MANAGER],
    styleSrc: ["self", "tagmanager.google.com", "*.googleapis.com"],
    imgSrc: ["self", GOOGLE_ANALYTICS, GOOGLE_TAG_MANAGER],
    frameAncestors: ["none"],
    generateNonces: "script",
  },
};

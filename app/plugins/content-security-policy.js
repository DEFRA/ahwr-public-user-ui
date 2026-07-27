import Blankie from "blankie";

const GOOGLE_ANALYTICS = "*.google-analytics.com";
const GOOGLE_TAG_MANAGER = "*.googletagmanager.com";

export const contentSecurityPolicyPlugin = {
  plugin: Blankie,
  options: {
    defaultSrc: ["self"],
    objectSrc: ["none"],
    scriptSrc: ["self", "www.google-analytics.com", GOOGLE_TAG_MANAGER],
    formAction: ["self"],
    baseUri: ["self"],
    connectSrc: ["self", GOOGLE_ANALYTICS, "*.analytics.google.com", GOOGLE_TAG_MANAGER],
    styleSrc: ["self", "tagmanager.google.com", "*.googleapis.com"],
    imgSrc: ["self", GOOGLE_ANALYTICS, GOOGLE_TAG_MANAGER],
    frameAncestors: ["none"],
    generateNonces: "script",
  },
};

import Blankie from "blankie";

export const contentSecurityPolicyPlugin = {
  plugin: Blankie,
  options: {
    defaultSrc: ["self"],
    objectSrc: ["none"],
    scriptSrc: ["self", "www.google-analytics.com", "*.googletagmanager.com"],
    formAction: ["self"],
    baseUri: ["self"],
    connectSrc: [
      "self",
      "*.google-analytics.com",
      "*.analytics.google.com",
      "*.googletagmanager.com",
    ],
    styleSrc: ["self", "tagmanager.google.com", "*.googleapis.com"],
    imgSrc: ["self", "*.google-analytics.com", "*.googletagmanager.com"],
    frameAncestors: ["none"],
    generateNonces: "script",
  },
};

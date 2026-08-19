import { config } from "../config/index.js";
import yar from "@hapi/yar";

export const sessionPlugin = {
  plugin: yar,
  options: {
    name: config.get("cookie.cookieNameSession"),
    maxCookieSize: config.get("useRedis") ? 0 : 1024, // Non-zero cookie size required when not using redis e.g for testing
    storeBlank: true,
    cache: {
      cache: config.get("cache.name"),
      expiresIn: config.get("cache.expiresIn"),
    },
    cookieOptions: {
      isHttpOnly: true,
      isSameSite: config.get("cookie.isSameSite"),
      isSecure: config.get("cookie.isSecure"),
      password: config.get("cookie.password"),
      ttl: config.get("cache.expiresIn"),
    },
  },
};

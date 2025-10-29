import { Engine as CatboxRedis } from "@hapi/catbox-redis";
import catboxMemory from "@hapi/catbox-memory";
import { buildRedisClient } from "./build-redis-client.js";
import { config } from "../config/index.js";
import { getLogger } from "../logging/logger.js";

const logger = getLogger()
export const getCacheEngine = () => {
  if (config.useRedis) {
    logger.info("Using Redis session cache");
    const redisClient = buildRedisClient();

    return {
      name: "session",
      engine: new CatboxRedis({ client: redisClient }),
    };
  }

  if (process.env.NODE_ENV === "production") {
    logger.info("Catbox Memory is for running tests, it should not be used in production!");
  }

  logger.info("Using Catbox Memory session cache");

  return {
    provider: {
      constructor: catboxMemory,
      options: {},
    },
  };
};

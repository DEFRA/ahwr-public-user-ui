import { Engine as CatboxRedis } from "@hapi/catbox-redis";
import catboxMemory from "@hapi/catbox-memory";
import { buildRedisClient } from "./build-redis-client.js";
import { config } from "../config/index.js";

export const getCacheEngine = () => {
  if (config.useRedis) {
    console.log("Using Redis session cache");
    const redisClient = buildRedisClient();

    return {
      name: "session",
      engine: new CatboxRedis({ client: redisClient }),
    };
  }

  if (process.env.NODE_ENV === "production") {
    console.log("Catbox Memory is for running tests, it should not be used in production!");
  }

  console.log("Using Catbox Memory session cache");

  return {
    provider: {
      constructor: catboxMemory,
      options: {},
    },
  };
};

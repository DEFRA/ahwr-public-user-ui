import { Cluster, Redis } from "ioredis";
import { config } from "../config/index.js";
import { getLogger } from "../logging/logger.js";

export function buildRedisClient() {
  const redisConfig = config.cache.options;
  const { keyPrefix, host, username, password, useSingleInstanceCache, useTLS } = redisConfig;
  const port = 6379;
  const db = 0;

  let credentials = {};

  if (username && password) {
    credentials = {
      username,
      password,
    };
  }

  let tls = {};

  if (useTLS) {
    tls = { tls: {} };
  }

  let redisClient;

  if (useSingleInstanceCache) {
    redisClient = new Redis({
      port,
      host,
      db,
      keyPrefix,
      ...credentials,
      ...tls,
    });
    getLogger().info("using single instance Redis cache");
  } else {
    const startupNodes = [{ host, port }];
    const clusterOptions = {
      keyPrefix,
      slotsRefreshTimeout: 10000,
      dnsLookup: (address, callback) => callback(null, address),
      redisOptions: {
        db,
        ...credentials,
        ...tls,
      },
    };

    redisClient = new Cluster(startupNodes, clusterOptions);
    getLogger().info("using clustered Redis cache");
  }

  redisClient.on("connect", () => {
    getLogger().info("Connected to Redis server");
  });

  redisClient.on("error", (error) => {
    getLogger().info(`Redis connection error ${error}`);
  });

  return redisClient;
}

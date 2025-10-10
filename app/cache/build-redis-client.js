import { Cluster, Redis } from "ioredis";
import { config } from "../config/index.js";

const redisConfig = config.cache.options;

export function buildRedisClient() {
  const port = 6379;
  const db = 0;
  const keyPrefix = redisConfig.keyPrefix;
  const host = redisConfig.host;

  let credentials = {};

  if (redisConfig.username) {
    credentials = {
      username: redisConfig.username,
      password: redisConfig.password,
    };
  }

  let tls = {};

  if (redisConfig.useTLS) {
    tls = { tls: {} };
  }

  let redisClient;

  if (redisConfig.useSingleInstanceCache) {
    redisClient = new Redis({
      port,
      host,
      db,
      keyPrefix,
      ...credentials,
      ...tls,
    });
  } else {
    const statupNodes = [{ host, port }];
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

    redisClient = new Cluster(statupNodes, clusterOptions);
  }

  redisClient.on("connect", () => {
    console.log("Connected to Redis server");
  });

  redisClient.on("error", (error) => {
    console.log(`Redis connection error ${error}`);
  });

  return redisClient;
}

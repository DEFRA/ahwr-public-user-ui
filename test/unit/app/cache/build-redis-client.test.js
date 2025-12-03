import { buildRedisClient } from "../../../../app/cache/build-redis-client.js";
import { Cluster, Redis } from "ioredis";
import { config } from "../../../../app/config/index.js";
import { getLogger } from "../../../../app/logging/logger.js";

jest.mock("ioredis", () => ({
  Redis: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
  })),
  Cluster: jest.fn().mockImplementation(() => ({
    on: jest.fn(),
  })),
}));

jest.mock("../../../../app/logging/logger.js", () => ({
  getLogger: jest.fn(),
}));
jest.mock("../../../../app/config/index.js", () => ({
  config: {
    cache: {
      options: {
        host: "test-host",
        keyPrefix: "test-keyprefix",
        useSingleInstanceCache: true,
      },
    },
  },
}));

describe("buildRedisClient", () => {
  let mockLogger;

  beforeEach(() => {
    mockLogger = { info: jest.fn() };
    getLogger.mockReturnValue(mockLogger);
    jest.clearAllMocks();
  });

  it("creates a single Redis instance when useSingleInstanceCache = true", () => {
    const client = buildRedisClient();

    expect(Redis).toHaveBeenCalledWith({
      port: 6379,
      host: "test-host",
      db: 0,
      keyPrefix: "test-keyprefix",
    });

    expect(Cluster).not.toHaveBeenCalled();
    expect(client.on).toHaveBeenCalledTimes(2);
  });

  it("creates a Redis cluster when useSingleInstanceCache = false", () => {
    config.cache.options.useSingleInstanceCache = false;

    const client = buildRedisClient();

    expect(Cluster).toHaveBeenCalledWith(
      [{ host: "test-host", port: 6379 }],
      expect.objectContaining({
        keyPrefix: "test-keyprefix",
        slotsRefreshTimeout: 10000,
        dnsLookup: expect.any(Function),
        redisOptions: expect.objectContaining({ db: 0 }),
      }),
    );

    expect(Redis).not.toHaveBeenCalled();
    expect(client.on).toHaveBeenCalledTimes(2);
  });

  it("adds username and password when present", () => {
    config.cache.options.useSingleInstanceCache = true;
    const username = "user1";
    const password = "pw123";
    config.cache.options.username = username;
    config.cache.options.password = password;

    buildRedisClient();

    expect(Redis).toHaveBeenCalledWith(
      expect.objectContaining({
        username,
        password,
      }),
    );
  });

  it("adds TLS when enabled", () => {
    config.cache.options.useTLS = true;

    buildRedisClient();

    expect(Redis).toHaveBeenCalledWith(
      expect.objectContaining({
        tls: {},
      }),
    );
  });

  it("registers connect and error event handlers", () => {
    const client = buildRedisClient();

    expect(client.on).toHaveBeenCalledWith("connect", expect.any(Function));
    expect(client.on).toHaveBeenCalledWith("error", expect.any(Function));
  });

  it("logs on connect", () => {
    const client = buildRedisClient();

    const connectHandler = client.on.mock.calls.find(([event]) => event === "connect")[1];

    connectHandler();

    expect(mockLogger.info).toHaveBeenCalledWith("Connected to Redis server");
  });

  it("logs on error", () => {
    const client = buildRedisClient();

    const errorHandler = client.on.mock.calls.find(([event]) => event === "error")[1];

    errorHandler("BOOM");

    expect(mockLogger.info).toHaveBeenCalledWith("Redis connection error BOOM");
  });
});

import { config } from "../../../../app/config/index.js";
import {
  getEventPublisher,
  startMessagingService,
  stopMessagingService,
} from "../../../../app/messaging/fcp-messaging-service.js";
import { createEventPublisher, createServiceBusClient } from "ffc-ahwr-common-library";

jest.mock("ffc-ahwr-common-library");

describe("FCP messaging service test", () => {
  const mockEventPublisher = { publishEvent: jest.fn() };
  const mockServiceBusClient = { close: jest.fn() };
  const mockLogger = {
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
  });

  test("when audit events disabled, use stub", async () => {
    config.isAuditEventEnabled = false;
    await startMessagingService(mockLogger);

    expect(getEventPublisher()).not.toBe(mockEventPublisher);
    expect(getEventPublisher()).toHaveProperty("publishEvent");
    expect(createServiceBusClient).toHaveBeenCalledTimes(0);

    await stopMessagingService();
    expect(mockServiceBusClient.close).toHaveBeenCalledTimes(0);
  });

  test("when audit events enabled, use Messaging service to send", async () => {
    config.isAuditEventEnabled = true;
    createServiceBusClient.mockReturnValueOnce(mockServiceBusClient);
    createEventPublisher.mockReturnValueOnce(mockEventPublisher);
    await startMessagingService(mockLogger);

    expect(getEventPublisher()).toBe(mockEventPublisher);
    expect(createServiceBusClient).toHaveBeenCalledTimes(1);

    await stopMessagingService();
    expect(mockServiceBusClient.close).toHaveBeenCalledTimes(1);
  });
});

import { createServiceBusClient, createEventPublisher } from "ffc-ahwr-common-library";
import { config } from "../config/index.js";

let fcpMessageClient;
let eventPublisher;

export const startMessagingService = async (logger) => {
  if (config.isAuditEventEnabled) {
    fcpMessageClient = createServiceBusClient({
      host: config.fcpMessaging.host,
      username: config.fcpMessaging.username,
      password: config.fcpMessaging.password,
      proxyUrl: config.proxy,
    });
    eventPublisher = createEventPublisher(fcpMessageClient, config.fcpMessaging.address, logger);
  } else {
    eventPublisher = { publishEvent: () => {} };
  }
};

export const stopMessagingService = async () => {
  if (fcpMessageClient) {
    await fcpMessageClient.close();
  }
};

export const getEventPublisher = () => {
  return eventPublisher;
};

import { createServiceBusClient, createEventPublisher } from "ffc-ahwr-common-library";
import { config } from "../config/index.js";

let fcpMessageClient;
let eventPublisher;

export const startMessagingService = async (logger) => {
  if (config.get("isAuditEventEnabled")) {
    fcpMessageClient = createServiceBusClient({
      host: config.get("fcpMessaging.host"),
      username: config.get("fcpMessaging.username"),
      password: config.get("fcpMessaging.password"),
      proxyUrl: config.get("proxy"),
    });
    eventPublisher = createEventPublisher(
      fcpMessageClient,
      config.get("fcpMessaging.address"),
      logger,
    );
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

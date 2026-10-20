import { startMessagingService, stopMessagingService } from "./messaging/fcp-messaging-service.js";
import { createServer } from "./server.js";

let server;

const init = async () => {
  server = await createServer();
  await server.start();
  await startMessagingService(server.logger);
};

process.on("unhandledRejection", async (err) => {
  console.log(err);
  await server.stop();
  server.logger.error(err, "unhandledRejection");
  await stopMessagingService();
  process.exit(1);
});

process.on("SIGINT", async () => {
  await server.stop();
  await stopMessagingService();
  process.exit(0);
});

init();

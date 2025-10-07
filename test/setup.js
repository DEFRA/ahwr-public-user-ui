import { config } from "dotenv";

process.env.EVENT_QUEUE_ADDRESS = "ffc-ahwr-test";
process.env.APPLICATION_API_URI = "http://localhost";
process.env.CLAIM_SERVICE_URI = "http://localhost:3004/claim";
process.env.MESSAGE_QUEUE_HOST = "test";
process.env.AZURE_STORAGE_APPLICATION_CONTAINER = "document";
process.env.AZURE_STORAGE_USE_CONNECTION_STRING = "true";
process.env.AZURE_STORAGE_ACCOUNT_NAME = "test";
process.env.AZURE_STORAGE_CONNECTION_STRING = "test";
process.env.COOKIE_PASSWORD = "test-55baf113-a8dc-4957-97e7-1f5340ace375";
process.env.TERMS_AND_CONDITIONS_URL = "test";

config();

import { config } from "dotenv";

process.env.APPLICATION_API_URI = "http://ahwr-application-backend/";
process.env.COOKIE_PASSWORD = "test-55baf113-a8dc-4957-97e7-1f5340ace375";
process.env.TERMS_AND_CONDITIONS_URL = "test";
process.env.MESSAGE_QUEUE_HOST = "something.servicebus.windows.net";
process.env.MESSAGE_QUEUE_USER = "message-queue-user";
process.env.FCP_AHWR_EVENT_QUEUE_SA_KEY = "abcdefghijk123456";
process.env.EVENT_QUEUE_ADDRESS = "ffc-ahwr-event-xyz";
process.env.DOCUMENT_BUCKET_NAME = "dev-ahwr-documents-xyz";
process.env.AWS_REGION = "eu-west-2";

config();

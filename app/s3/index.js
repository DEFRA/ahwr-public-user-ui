import { S3Client } from "@aws-sdk/client-s3";
import { config } from "../config/index.js";

export const getS3Client = () => {
  if (config.get("isDev")) {
    return new S3Client({
      region: "eu-west-2",
      endpoint: "http://localhost:4566",
      forcePathStyle: true,
      credentials: {
        accessKeyId: "test",
        secretAccessKey: "test",
      },
    });
  }

  const region = config.get("awsRegion");

  return new S3Client({ region });
};

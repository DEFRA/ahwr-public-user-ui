import { BlobServiceClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";
import { storageConfig } from "./config/storage.js";
import { streamToBuffer } from "./lib/streamToBuffer.js";

let blobServiceClient;
function initialiseClient() {
  if (!blobServiceClient) {
    const { connectionString, useConnectionString, storageAccount } = storageConfig;

    if (useConnectionString === true) {
      blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    } else {
      const uri = `https://${storageAccount}.blob.core.windows.net`;
      blobServiceClient = new BlobServiceClient(
        uri,
        new DefaultAzureCredential({
          managedIdentityClientId: process.env.AZURE_CLIENT_ID,
        }),
      );
    }
  }
}

export const getBlob = async (filename) => {
  initialiseClient();

  const container = blobServiceClient.getContainerClient(
    storageConfig.applicationDocumentsContainer,
  );
  const blobClient = container.getBlobClient(filename);
  const downloadResponse = await blobClient.download();
  return await streamToBuffer(downloadResponse.readableStreamBody);
};

import joi from "joi";

export const getStorageConfig = () => {
  // Define config schema
  const schema = joi.object({
    connectionString: joi.string().required(),
    applicationDocumentsContainer: joi.string().default("documents"),
    useConnectionString: joi.bool().required(),
    storageAccount: joi.string().required(),
  });

  // Build config
  const storageConfig = {
    connectionString: process.env.AZURE_STORAGE_CONNECTION_STRING,
    useConnectionString: process.env.AZURE_STORAGE_USE_CONNECTION_STRING === "true",
    applicationDocumentsContainer: process.env.AZURE_STORAGE_APPLICATION_CONTAINER,
    storageAccount: process.env.AZURE_STORAGE_ACCOUNT_NAME,
  };

  // Validate config
  const { error } = schema.validate(storageConfig, {
    abortEarly: false,
  });

  // Throw if config is invalid
  if (error) {
    throw new Error(`The blob storage config is invalid. ${error.message}`);
  }

  return storageConfig;
};

export const storageConfig = getStorageConfig();

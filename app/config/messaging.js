import joi from "joi";

export const getMessageQueueConfig = () => {
  const mqSchema = joi.object({
    messageQueue: {
      host: joi.string().required(),
      username: joi.string(),
      password: joi.string(),
      useCredentialChain: joi.bool().required(),
      managedIdentityClientId: joi.string().optional(),
      connectionString: joi.string().optional(),
    },
    eventQueue: {
      address: process.env.EVENT_QUEUE_ADDRESS,
      type: "queue",
    },
  });

  const mqConfig = {
    messageQueue: {
      host: process.env.MESSAGE_QUEUE_HOST,
      username: process.env.MESSAGE_QUEUE_USER,
      password: process.env.MESSAGE_QUEUE_PASSWORD,
      useCredentialChain: process.env.NODE_ENV === "production",
      managedIdentityClientId: process.env.AZURE_CLIENT_ID,
      connectionString: process.env.QUEUE_CONNECTION_STRING,
    },
    eventQueue: {
      address: process.env.EVENT_QUEUE_ADDRESS,
      type: "queue",
    },
  };

  const mqResult = mqSchema.validate(mqConfig, {
    abortEarly: false,
  });

  if (mqResult.error) {
    throw new Error(`The message queue config is invalid. ${mqResult.error.message}`);
  }

  return mqConfig;
};

const allConfig = getMessageQueueConfig();
export const eventQueue = {
  ...allConfig.messageQueue,
  ...allConfig.eventQueue,
};

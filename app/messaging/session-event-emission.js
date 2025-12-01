import { config } from "../config/index.js";
import { getEventPublisher } from "./fcp-messaging-service.js";

const SEND_SESSION_EVENT = "send-session-event";

export const sendSessionEvent = async ({
  id,
  sbi,
  email,
  journey,
  sessionKey,
  value,
  claimReference,
  applicationReference,
}) => {
  const { publishEvent } = getEventPublisher();

  const payload = {
    name: SEND_SESSION_EVENT,
    id,
    sbi,
    cph: "n/a",
    checkpoint: config.serviceName,
    status: "success",
    type: `${journey}-${sessionKey}`, // e.g. claim-vetsName or farmerApplyData-agreeMultipleSpecies
    message: `Session set for ${journey} and ${sessionKey}.`,
    data: { claimReference, applicationReference, [sessionKey]: value },
    raisedBy: email,
    raisedOn: new Date().toISOString(),
  };

  await publishEvent(payload);
};

export const sendHerdEvent = async ({ sbi, email, sessionId, type, message, data }) => {
  const { publishEvent } = getEventPublisher();

  const payload = {
    name: SEND_SESSION_EVENT,
    id: sessionId,
    sbi,
    cph: "n/a",
    checkpoint: config.serviceName,
    status: "success",
    type,
    message,
    data,
    raisedBy: email,
    raisedOn: new Date().toISOString(),
  };

  await publishEvent(payload);
};

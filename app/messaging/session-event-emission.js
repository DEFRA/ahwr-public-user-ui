import { config } from "../config/index.js";
import { getEventPublisher } from "./fcp-messaging-service.js";

const SEND_SESSION_EVENT = "send-session-event";

const EVENT_KEY_BY_SESSION_KEY = {
  laboratoryURN: "urnResult",
  vetsName: "vetName",
  vetRCVSNumber: "vetRcvs",
  dateOfVisit: "visitDate",
  numberAnimalsTested: "animalsTested",
};

const renameSessionKeysForEventReporting = (key) => EVENT_KEY_BY_SESSION_KEY[key] ?? key;

export const sendSessionEvent = async ({
  id,
  sbi,
  email,
  journey,
  sessionKey,
  value,
  claimReference,
  applicationReference = undefined,
  reference = undefined, // apply applicationReference
}) => {
  const { publishEvent } = getEventPublisher();
  const eventKey = EVENT_KEY_BY_SESSION_KEY[sessionKey] ?? sessionKey;

  const payload = {
    name: SEND_SESSION_EVENT,
    id,
    sbi,
    cph: "n/a",
    checkpoint: config.serviceName,
    status: "success",
    type: `${journey}-${eventKey}`, // e.g. claim-vetsName or farmerApplyData-agreeMultipleSpecies
    message: `Session set for ${journey} and ${eventKey}.`,
    data: { claimReference, applicationReference, reference, [eventKey]: value },
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

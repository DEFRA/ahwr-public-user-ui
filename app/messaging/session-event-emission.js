import { config } from "../config/index.js";
import { getEventPublisher } from "./fcp-messaging-service.js";

const SEND_SESSION_EVENT = "send-session-event";

// This has been done to keep consistent with old journey.
// Should look at refactoring this for best name options.
const renameSessionKeysForEventReporting = (key) => {
  switch (key) {
    case "laboratoryURN": {
      key = "urnResult";
      break;
    }
    case "vetsName": {
      key = "vetName";
      break;
    }
    case "vetRCVSNumber": {
      key = "vetRcvs";
      break;
    }
    case "dateOfVisit": {
      key = "visitDate";
      break;
    }
    case "numberAnimalsTested": {
      key = "animalsTested";
      break;
    }
    default:
      break;
  }
  return key;
};

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
  sessionKey = renameSessionKeysForEventReporting(sessionKey);

  const payload = {
    name: SEND_SESSION_EVENT,
    id,
    sbi,
    cph: "n/a",
    checkpoint: config.serviceName,
    status: "success",
    type: `${journey}-${sessionKey}`, // e.g. claim-vetsName or farmerApplyData-agreeMultipleSpecies
    message: `Session set for ${journey} and ${sessionKey}.`,
    data: { claimReference, applicationReference, reference, [sessionKey]: value },
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

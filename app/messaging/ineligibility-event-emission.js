import { config } from "../config/index.js";
import { getSessionData, sessionEntryKeys, sessionKeys } from "../session/index.js";
import { getEventPublisher } from "./fcp-messaging-service.js";

const INELIGIBILITY_EVENT = "send-ineligibility-event";

export const sendIneligibilityEvent = async ({ sessionId, sbi, email, crn, exception }) => {
  const { publishEvent } = getEventPublisher();

  const payload = {
    name: INELIGIBILITY_EVENT,
    id: sessionId,
    sbi,
    cph: "n/a",
    checkpoint: config.serviceName,
    status: "alert",
    type: "ineligibility-event",
    message: `Login failed as user ineligible: ${exception}`,
    data: {
      sbi,
      crn,
      exception,
      raisedAt: new Date().toISOString(),
      journey: "login",
    },
    raisedBy: email,
    raisedOn: new Date().toISOString(),
  };

  await publishEvent(payload);
};

export const sendInvalidDataEvent = async ({ request, sessionKey, exception }) => {
  const { publishEvent } = getEventPublisher();
  const { reference, latestEndemicsApplication } = getSessionData(
    request,
    sessionEntryKeys.endemicsClaim,
  );
  const organisation = getSessionData(request, sessionEntryKeys.organisation);
  const crn = getSessionData(request, sessionEntryKeys.customer, sessionKeys.customer.crn);

  const payload = {
    id: request.yar.id,
    sbi: organisation?.sbi,
    cph: "n/a",
    checkpoint: config.serviceName,
    email: organisation?.email,
    name: "send-invalid-data-event",
    type: `claim-${sessionKey}-invalid`,
    message: `${sessionKey}: ${exception}`,
    data: {
      sbi: organisation?.sbi,
      crn,
      sessionKey,
      exception,
      raisedAt: new Date().toISOString(),
      journey: "claim",
      reference,
      applicationReference: latestEndemicsApplication.reference,
    },
    status: "alert",
    raisedBy: organisation.email,
    raisedOn: new Date().toISOString(),
  };

  await publishEvent(payload);
};

import { config } from "../config/index.js";
import { getEventPublisher } from "./fcp-messaging-service.js";

const SEND_SESSION_EVENT = "send-session-event";

const EVENT_KEY_BY_SESSION_KEY = {
  laboratoryURN: "urnResult",
  vetsName: "vetName",
  vetRCVSNumber: "vetRcvs",
  dateOfVisit: "visitDate",
  numberAnimalsTested: "animalsTested",
  selectedFunding: "schemeType",
  minimumNumberOfBirds: "speciesNumbers",
  changesInBiosecurity: "biosecurityChanges",
  costOfChanges: "biosecurityChangesCost",
  interview: "schemeExperienceInterview",
};

const REVIEW_TYPE_MAP = {
  REVIEW: "R",
  FOLLOW_UP: "E",
};

const NORMALIZE_VALUE_BY_SESSION_KEY = {
  typeOfReview: (value) => REVIEW_TYPE_MAP[value] ?? value,
  typesOfPoultry: (value) =>
    value?.length ? value.filter((type) => type !== "chickens").join(" ") : "",
  selectedFunding: (value) => (value === "POUL" ? "poultry" : "livestock"),
  biosecurity: (value) =>
    typeof value === "string" && value.length > 0 ? { biosecurity: value } : value,
};

const NORMALIZE_JOURNEY_BY_JOURNEY = {
  fundingSelection: "scheme",
  poultryClaim: "claim",
  endemicsClaim: "claim",
};

export const sendSessionEvent = async ({
  id,
  sbi,
  email,
  journey,
  sessionKey,
  value,
  applicationReference,
  reference,
}) => {
  const { publishEvent } = getEventPublisher();
  const eventKey = EVENT_KEY_BY_SESSION_KEY[sessionKey] ?? sessionKey;
  const eventValue = NORMALIZE_VALUE_BY_SESSION_KEY[sessionKey]?.(value) ?? value;
  const journeyValue = NORMALIZE_JOURNEY_BY_JOURNEY[journey] ?? journey;

  const payload = {
    name: SEND_SESSION_EVENT,
    id,
    sbi,
    cph: "n/a",
    checkpoint: config.serviceName,
    status: "success",
    type: `${journeyValue}-${eventKey}`, // e.g. claim-vetsName or farmerApplyData-agreeMultipleSpecies
    message: `Session set for ${journeyValue} and ${eventKey}.`,
    data: { reference, applicationReference, [eventKey]: eventValue },
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

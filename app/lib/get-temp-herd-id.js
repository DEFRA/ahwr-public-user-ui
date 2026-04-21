import { v4 as uuidv4 } from "uuid";
import { setSessionData, sessionEntryKeys, sessionKeys } from "../session/index.js";

export const getTempHerdId = async (request, tempHerdIdFromSession) => {
  if (tempHerdIdFromSession) {
    return tempHerdIdFromSession;
  }

  const tempHerdId = uuidv4();
  await setSessionData(
    request,
    sessionEntryKeys.endemicsClaim,
    sessionKeys.endemicsClaim.tempHerdId,
    tempHerdId,
    { shouldEmitEvent: false },
  );
  return tempHerdId;
};

export const getTempSiteId = async (request) => {
  const tempSiteId = uuidv4();
  await setSessionData(
    request,
    sessionEntryKeys.poultryClaim,
    sessionKeys.poultryClaim.tempSiteId,
    tempSiteId,
    { shouldEmitEvent: false },
  );
  return tempSiteId;
};

import { v4 as uuidv4 } from "uuid";
import { setSessionData, sessionEntryKeys, sessionKeys } from "../session/index.js";

export const getTempHerdId = (request, tempHerdIdFromSession) => {
  if (tempHerdIdFromSession) {
    return tempHerdIdFromSession;
  }

  const tempHerdId = uuidv4();
  setSessionData(
    request,
    sessionEntryKeys.endemicsClaim,
    sessionKeys.endemicsClaim.tempHerdId,
    tempHerdId,
  );
  return tempHerdId;
};

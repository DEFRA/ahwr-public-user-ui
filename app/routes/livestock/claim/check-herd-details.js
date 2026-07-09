import { livestockClaimRoutes, livestockClaimViews } from "../../../constants/routes.js";
import { ONLY_HERD_ON_SBI } from "../../../constants/claim-constants.js";
import { getHerdOrFlock } from "../../../lib/display-helpers.js";
import { getSessionData, sessionEntryKeys } from "../../../session/index.js";
import { MULTIPLE_HERD_REASONS } from "ffc-ahwr-common-library";
import { skipOtherHerdsOnSbiPage, skipSameHerdPage } from "../../../lib/context-helper.js";
import { getNextMultipleHerdsPage } from "../../../lib/get-next-multiple-herds-page.js";

const getHerdReasonsText = (herdReasons) => {
  return herdReasons?.map((key) => MULTIPLE_HERD_REASONS[key]).join("<br>");
};

const getHandler = {
  method: "GET",
  path: livestockClaimRoutes.checkHerdDetails,
  options: {
    tags: ["mh"],
    handler: async (request, h) => {
      const { herdId, herdName, herdCph, herdReasons, isOnlyHerdOnSbi, typeOfLivestock, herds } =
        getSessionData(request, sessionEntryKeys.endemicsClaim);
      const herdReasonsText =
        isOnlyHerdOnSbi === ONLY_HERD_ON_SBI.YES ? undefined : getHerdReasonsText(herdReasons);

      return h.view(livestockClaimViews.checkHerdDetails, {
        backLink:
          isOnlyHerdOnSbi === ONLY_HERD_ON_SBI.YES
            ? livestockClaimRoutes.herdOthersOnSbi
            : livestockClaimRoutes.enterHerdDetails,
        herdName,
        herdCph,
        herdReasons: herdReasonsText,
        isOnlyHerdOnSbi: skipOtherHerdsOnSbiPage(herds, herdId) ? undefined : isOnlyHerdOnSbi,
        herdCphLink: livestockClaimRoutes.enterCphNumber,
        herdReasonsLink: livestockClaimRoutes.enterHerdDetails,
        isOnlyHerdOnSbiLink: livestockClaimRoutes.herdOthersOnSbi,
        herdOrFlock: getHerdOrFlock(typeOfLivestock),
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: livestockClaimRoutes.checkHerdDetails,
  options: {
    handler: async (request, h) => {
      const { previousClaims, typeOfLivestock } = getSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
      );

      const nextPageUrl = skipSameHerdPage(previousClaims, typeOfLivestock)
        ? await getNextMultipleHerdsPage(request)
        : livestockClaimRoutes.sameHerd;
      return h.redirect(nextPageUrl);
    },
  },
};

export const checkHerdDetailsHandlers = [getHandler, postHandler];

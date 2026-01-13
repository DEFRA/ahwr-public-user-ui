import Joi from "joi";
import {
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
  emitHerdEvent,
} from "../../session/index.js";
import HttpStatus from "http-status-codes";
import { MULTIPLE_HERD_REASONS } from "ffc-ahwr-common-library";
import { getHerdOrFlock } from "../../lib/display-helpers.js";
import { skipOtherHerdsOnSbiPage } from "../../lib/context-helper.js";
import { claimRoutes, claimViews } from "../../constants/routes.js";

const getPreviousPageUrl = (herds, herdId) =>
  skipOtherHerdsOnSbiPage(herds, herdId) ? claimRoutes.enterCphNumber : claimRoutes.herdOthersOnSbi;

const HINT_TEXT_BY_REASON = {
  separateManagementNeeds: "for example, year-round or block calving",
  uniqueHealthNeeds: "for example, different vaccination schedules",
  differentBreed: "for example, breed types kept completely separately",
  differentPurpose:
    "for example, breeding, conservation grazing, cultural or heritage purposes like showing",
  keptSeparate: "for example, at a different location, housing or grazing area",
};

const getEnterHerdDetailsViewData = (request, ignoreHerdReasons = false) => {
  const { herdId, herdReasons, typeOfLivestock, herds } = getSessionData(
    request,
    sessionEntryKeys.endemicsClaim,
  );
  const selectedHerdReasons = ignoreHerdReasons ? [] : (herdReasons ?? []);
  const checkboxItemsForHerdReasons = Object.entries(MULTIPLE_HERD_REASONS)
    .filter(([code, _]) => code !== "other") // other removed for now, likely to be added phase 2
    .map(([code, description]) => ({
      value: code,
      text: description,
      hint: {
        text: HINT_TEXT_BY_REASON[code] || "",
      },
      checked: selectedHerdReasons.includes(code),
    }));

  return {
    backLink: getPreviousPageUrl(herds, herdId),
    checkboxItemsForHerdReasons,
    herdReasons: selectedHerdReasons,
    herdOrFlock: getHerdOrFlock(typeOfLivestock),
  };
};

const getHandler = {
  method: "GET",
  path: "/enter-herd-details",
  options: {
    handler: async (request, h) => {
      const { backLink, checkboxItemsForHerdReasons, herdReasons, herdOrFlock } =
        getEnterHerdDetailsViewData(request);

      return h.view(claimViews.enterHerdDetails, {
        backLink,
        checkboxItemsForHerdReasons,
        herdReasons,
        herdOrFlock,
      });
    },
  },
};

const postHandler = {
  method: "POST",
  path: "/enter-herd-details",
  options: {
    validate: {
      payload: Joi.object({
        herdReasons: Joi.alternatives()
          .try(Joi.string(), Joi.array().items(Joi.string()).min(1))
          .required(),
      }),
      failAction: async (request, h, error) => {
        request.logger.error({ error });
        const { backLink, checkboxItemsForHerdReasons, herdReasons, herdOrFlock } =
          getEnterHerdDetailsViewData(request, true);

        return h
          .view(claimViews.enterHerdDetails, {
            ...request.payload,
            errorMessage: {
              text: `Select the reasons for this separate ${herdOrFlock}`,
              href: "#herdReasons",
            },
            backLink,
            checkboxItemsForHerdReasons,
            herdReasons,
            herdOrFlock,
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      },
    },
    handler: async (request, h) => {
      const { herdReasons } = request.payload;
      const { herdId, herdVersion } = getSessionData(request, sessionEntryKeys.endemicsClaim);

      await setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.herdReasons,
        [].concat(herdReasons).flat(),
        { shouldEmitEvent: false },
      );

      await emitHerdEvent({
        request,
        type: "herd-reasons",
        message: "Herd reasons collected from user",
        data: {
          herdId,
          herdVersion,
          herdReasonManagementNeeds: herdReasons.includes("separateManagementNeeds"),
          herdReasonUniqueHealth: herdReasons.includes("uniqueHealthNeeds"),
          herdReasonDifferentBreed: herdReasons.includes("differentBreed"),
          herdReasonOtherPurpose: herdReasons.includes("differentPurpose"),
          herdReasonKeptSeparate: herdReasons.includes("keptSeparate"),
          herdReasonOnlyHerd: false,
          herdReasonOther: herdReasons.includes("other"),
        },
      });

      return h.redirect(claimRoutes.checkHerdDetails);
    },
  },
};

export const enterHerdDetailsHandlers = [getHandler, postHandler];

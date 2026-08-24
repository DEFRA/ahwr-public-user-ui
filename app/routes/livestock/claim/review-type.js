import Joi from "joi";
import HttpStatus from "http-status-codes";
import { livestockClaimRoutes, livestockClaimViews } from "../../../constants/routes.js";
import {
  getSessionData,
  sessionEntryKeys,
  sessionKeys,
  setSessionData,
} from "../../../session/index.js";
import { claimType } from "ffc-ahwr-common-library";
import { BEEF, DAIRY } from "../../../constants/claim-constants.js";
import { sendInvalidDataEvent } from "../../../messaging/ineligibility-event-emission.js";

const getPreviousAnswer = (typeOfReview) => {
  if (typeOfReview === claimType.review) {
    return "review";
  }

  if (typeOfReview === claimType.endemics) {
    return "endemics";
  }

  return undefined;
};

export const whichReviewHandlers = [
  {
    method: "GET",
    path: livestockClaimRoutes.whichTypeOfReview,
    options: {
      handler: async (request, h) => {
        const { typeOfReview } = getSessionData(request, sessionEntryKeys.endemicsClaim);

        return h.view(livestockClaimViews.whichTypeOfReview, {
          backLink: livestockClaimRoutes.whichSpecies,
          previousAnswer: getPreviousAnswer(typeOfReview),
        });
      },
    },
  },
  {
    method: "POST",
    path: livestockClaimRoutes.whichTypeOfReview,
    options: {
      validate: {
        payload: Joi.object({
          typeOfReview: Joi.string().valid("review", "endemics").required(),
        }),
        failAction: (request, h, error) => {
          request.logger.error({ error });

          return h
            .view(livestockClaimViews.whichTypeOfReview, {
              errorMessage: { text: "Select what you are claiming for", href: "#typeOfReview" },
              backLink: livestockClaimRoutes.whichSpecies,
            })
            .code(HttpStatus.BAD_REQUEST)
            .takeover();
        },
      },
      handler: async (request, h) => {
        const { typeOfReview } = request.payload;
        const {
          typeOfLivestock,
          previousClaims,
          latestVetVisitApplication: oldWorldApplication,
        } = getSessionData(request, sessionEntryKeys.endemicsClaim);

        await setSessionData(
          request,
          sessionEntryKeys.endemicsClaim,
          sessionKeys.endemicsClaim.typeOfReview,
          claimType[typeOfReview],
        );

        const relevantClaims = previousClaims.filter(
          (claim) => claim.data.typeOfLivestock === typeOfLivestock,
        );

        const oldWorldClaimTypeOfLivestock = oldWorldApplication?.data?.whichReview;

        if (claimType[typeOfReview] === claimType.endemics) {
          const prevReviewClaim = relevantClaims.some((claim) => claim.type === claimType.review);

          if (!prevReviewClaim) {
            await sendInvalidDataEvent({
              request,
              sessionKey: sessionKeys.endemicsClaim.typeOfReview,
              exception: "Cannot claim for endemics without a previous review.",
            });

            return h
              .view(livestockClaimViews.whichTypeOfReviewException, {
                backLink: livestockClaimRoutes.whichTypeOfReview,
                backToPageMessage: "Tell us if you are claiming for a review or follow up.",
              })
              .code(HttpStatus.BAD_REQUEST)
              .takeover();
          }
        }

        const isCattleEndemicsClaimForOldWorldReview =
          claimType[typeOfReview] === claimType.endemics &&
          [BEEF, DAIRY].includes(oldWorldClaimTypeOfLivestock) &&
          relevantClaims.length === 0 &&
          typeOfLivestock === oldWorldClaimTypeOfLivestock;

        if (isCattleEndemicsClaimForOldWorldReview) {
          return h.redirect(livestockClaimRoutes.vetVisitsReviewTestResults);
        }

        return h.redirect(livestockClaimRoutes.dateOfVisit);
      },
    },
  },
];

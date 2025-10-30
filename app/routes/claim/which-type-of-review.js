import Joi from "joi";
import HttpStatus from "http-status-codes";
import { claimRoutes, claimViews } from "../../constants/routes.js";
import { getSessionData, sessionEntryKeys, sessionKeys, setSessionData } from "../../session/index.js";
import { getOldWorldClaimFromApplication } from "../../lib/claim-helper.js";
import { claimType } from "ffc-ahwr-common-library";
import { BEEF, DAIRY } from "../../constants/claim-constants.js";


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
    path: claimRoutes.whichTypeOfReview,
    options: {
      handler: async (request, h) => {
        const { typeOfReview } = getSessionData(request, sessionEntryKeys.endemicsClaim);

        return h.view(claimViews.whichTypeOfReview, {
          backLink: claimRoutes.whichSpecies,
          previousAnswer: getPreviousAnswer(typeOfReview),
        });
      },
    },
  },
  {
    method: "POST",
    path: claimRoutes.whichTypeOfReview,
    options: {
      validate: {
        payload: Joi.object({
          typeOfReview: Joi.string().valid("review", "endemics").required(),
        }),
        failAction: (request, h, err) => {
          request.logger.setBindings({ error: err });

          return h
            .view(claimViews.whichTypeOfReview, {
              errorMessage: { text: "Select what you are claiming for", href: "#typeOfReview" },
              backLink: claimRoutes.whichSpecies,
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

        // TODO: Should emit event
        setSessionData(request, sessionEntryKeys.endemicsClaim, sessionKeys.endemicsClaim.typeOfReview, claimType[typeOfReview]);

        const relevantClaims = previousClaims.filter(
          (claim) => claim.data.typeOfLivestock === typeOfLivestock,
        );

        const oldWorldClaimTypeOfLivestock = oldWorldApplication?.data?.whichReview;

        if (claimType[typeOfReview] === claimType.endemics) {
          const prevReviewClaim =
            relevantClaims.find((claim) => claim.type === claimType.review) ||
            getOldWorldClaimFromApplication(oldWorldApplication, typeOfLivestock);

          if (!prevReviewClaim) {
            // TODO: Raise invalid data event
            // raiseInvalidDataEvent(
            //   request,
            //   typeOfReviewKey,
            //   "Cannot claim for endemics without a previous review.",
            // );

            return h
              .view(claimViews.whichTypeOfReviewException, {
                backLink: claimRoutes.whichTypeOfReview,
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
          return h.redirect(claimRoutes.vetVisitsReviewTestResults);
        }

        return h.redirect(claimRoutes.dateOfVisit);
      },
    },
  },
];

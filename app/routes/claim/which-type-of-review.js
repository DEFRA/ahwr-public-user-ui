import Joi from "joi";
import { sessionKeys } from "../../session/keys.js";
import { claimConstants } from "../../constants/claim-constants.js";
import links from "../../config/routes.js";
import { getEndemicsClaim, setEndemicsClaim } from "../../session/index.js";
import { getOldWorldClaimFromApplication } from "../../lib/index.js";
import { raiseInvalidDataEvent } from "../../event/raise-invalid-data-event.js";
import HttpStatus from "http-status-codes";
import { prefixUrl } from "../utils/page-utils.js";

const {
  endemicsClaim: { typeOfReview: typeOfReviewKey },
} = sessionKeys;
const {
  endemicsWhichTypeOfReview,
  endemicsDateOfVisit,
  endemicsVetVisitsReviewTestResults,
  endemicsWhichSpecies,
  endemicsWhichTypeOfReviewException,
} = links;
const { livestockTypes, claimType } = claimConstants;

const pageUrl = prefixUrl(endemicsWhichTypeOfReview);
const backLink = prefixUrl(endemicsWhichSpecies);

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
    path: pageUrl,
    options: {
      handler: async (request, h) => {
        const { typeOfReview } = getEndemicsClaim(request);

        return h.view(endemicsWhichTypeOfReview, {
          backLink,
          previousAnswer: getPreviousAnswer(typeOfReview),
        });
      },
      tags: ["ms"],
    },
  },
  {
    method: "POST",
    path: pageUrl,
    options: {
      validate: {
        payload: Joi.object({
          typeOfReview: Joi.string().valid("review", "endemics").required(),
        }),
        failAction: (request, h, err) => {
          request.logger.setBindings({ err });

          return h
            .view(endemicsWhichTypeOfReview, {
              errorMessage: { text: "Select what you are claiming for", href: "#typeOfReview" },
              backLink,
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
        } = getEndemicsClaim(request);

        setEndemicsClaim(request, typeOfReviewKey, claimType[typeOfReview]);

        const relevantClaims = previousClaims.filter(
          (claim) => claim.data.typeOfLivestock === typeOfLivestock,
        );

        const oldWorldClaimTypeOfLivestock = oldWorldApplication?.data?.whichReview;

        if (claimType[typeOfReview] === claimType.endemics) {
          const prevReviewClaim =
            relevantClaims.find((claim) => claim.type === claimType.review) ||
            getOldWorldClaimFromApplication(oldWorldApplication, typeOfLivestock);

          if (!prevReviewClaim) {
            raiseInvalidDataEvent(
              request,
              typeOfReviewKey,
              "Cannot claim for endemics without a previous review.",
            );

            return h
              .view(`${endemicsWhichTypeOfReviewException}`, {
                backLink: pageUrl,
                backToPageMessage: "Tell us if you are claiming for a review or follow up.",
              })
              .code(HttpStatus.BAD_REQUEST)
              .takeover();
          }
        }

        const isCattleEndemicsClaimForOldWorldReview =
          claimType[typeOfReview] === claimType.endemics &&
          [livestockTypes.beef, livestockTypes.dairy].includes(oldWorldClaimTypeOfLivestock) &&
          relevantClaims.length === 0 &&
          typeOfLivestock === oldWorldClaimTypeOfLivestock;

        if (isCattleEndemicsClaimForOldWorldReview) {
          return h.redirect(prefixUrl(endemicsVetVisitsReviewTestResults));
        }

        return h.redirect(prefixUrl(endemicsDateOfVisit));
      },
    },
  },
];

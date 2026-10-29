import Joi from "joi";
import HttpStatus from "http-status-codes";
import { livestockClaimRoutes, livestockClaimViews } from "../../../constants/routes.js";
import {
  getSessionData,
  sessionEntryKeys,
  sessionKeys,
  setSessionData,
} from "../../../session/index.js";
import { formatDate, getHerdOrFlock } from "../../../lib/display-helpers.js";
import { filterReviewsWithNoFollowUps } from "../../../lib/can-make-claim.js";
import { claimType } from "ffc-ahwr-common-library";

const getReviews = (request) => {
  const { previousClaims, typeOfLivestock, dateOfVisit, herdId } = getSessionData(
    request,
    sessionEntryKeys.endemicsClaim,
  );

  const currentHerdReviews = previousClaims.filter(
    (claim) =>
      claim.type === claimType.review &&
      claim.herd.id === herdId &&
      claim.data.typeOfLivestock === typeOfLivestock,
  );
  const { reviews } = filterReviewsWithNoFollowUps(currentHerdReviews, dateOfVisit);

  return reviews.map((review) => ({
    value: review.reference,
    html: `<b>Date of review</b>: ${formatDate(review.data.dateOfVisit)}`,
    hint: {
      html: `<b>Claim number</b>: ${review.reference}`,
      classe: "govuk-!-secondary-text",
    },
  }));
};

export const selectReviewHandlers = [
  {
    method: "GET",
    path: livestockClaimRoutes.selectReview,
    options: {
      handler: async (request, h) => {
        const { herdName, typeOfLivestock } = getSessionData(
          request,
          sessionEntryKeys.endemicsClaim,
        );

        return h.view(livestockClaimViews.selectReview, {
          backLink: livestockClaimRoutes.dateOfVisit,
          reviews: getReviews(request),
          herdName,
          species: typeOfLivestock,
          typeOfLivestock,
          herdOrFlock: getHerdOrFlock(typeOfLivestock),
        });
      },
    },
  },
  {
    method: "POST",
    path: livestockClaimRoutes.selectReview,
    options: {
      validate: {
        payload: Joi.object({
          reviews: Joi.string().required(),
        }),
        failAction: (request, h, error) => {
          request.logger.error({ error });

          const { herdName, typeOfLivestock } = getSessionData(
            request,
            sessionEntryKeys.endemicsClaim,
          );

          return h
            .view(livestockClaimViews.selectReview, {
              errorMessage: { text: "Select the review claim this follow up is ", href: "#review" },
              backLink: livestockClaimRoutes.selectReview,
              reviews: getReviews(request),
              herdName,
              species: typeOfLivestock,
              typeOfLivestock,
              herdOrFlock: getHerdOrFlock(typeOfLivestock),
            })
            .code(HttpStatus.BAD_REQUEST)
            .takeover();
        },
      },
      handler: async (request, h) => {
        const { reviews: reviewReference } = request.payload;
        await setSessionData(
          request,
          sessionEntryKeys.endemicsClaim,
          sessionKeys.endemicsClaim.selectedReview,
          reviewReference,
        );

        return h.redirect(livestockClaimRoutes.checkHerdDetails);
      },
    },
  },
];

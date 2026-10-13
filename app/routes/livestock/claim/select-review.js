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
import { formatDate, getHerdOrFlock } from "../../../lib/display-helpers.js";

const getReviews = (request) => {
  const { previousClaims, typeOfLivestock, dateOfVisit, herdId } = getSessionData(
    request,
    sessionEntryKeys.endemicsClaim,
  );

  const reviews = previousClaims.filter(
    (claim) =>
      claim.type === claimType.review &&
      claim.data.dateOfVisit <= dateOfVisit &&
      claim.herd.id === herdId &&
      claim.data.typeOfLivestock === typeOfLivestock,
  );

  return reviews.map((review) => ({
    value: review.reference,
    html: `<b>Claim number</b>: ${review.reference}`,
    hint: {
      html: `Date of review: ${formatDate(review.data.dateOfTesting)}<br>Claim date: ${formatDate(review.createdAt)}<br>Last visit date: ${formatDate(review.data.dateOfTesting)}`,
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

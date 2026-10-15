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
    text: `${review.herd.name}`,
    hint: {
      text: `Date of visit: ${new Date(review.data.dateOfVisit).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`,
    },
  }));
};

export const selectReviewHandlers = [
  {
    method: "GET",
    path: livestockClaimRoutes.selectReview,
    options: {
      handler: async (request, h) => {
        return h.view(livestockClaimViews.selectReview, {
          backLink: livestockClaimRoutes.dateOfVisit,
          reviews: getReviews(request),
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

          return h
            .view(livestockClaimViews.selectReview, {
              errorMessage: { text: "Select the review claim this follow up is ", href: "#review" },
              backLink: livestockClaimRoutes.selectReview,
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

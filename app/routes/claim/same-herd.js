import Joi from "joi";
import {
  removeSessionDataForSameHerdChange,
  getSessionData,
  setSessionData,
  sessionEntryKeys,
  sessionKeys,
} from "../../session/index.js";
import HttpStatus from "http-status-codes";
import { getReviewType } from "../../lib/utils.js";
import { canMakeClaim } from "../../lib/can-make-claim.js";
import { getHerdOrFlock } from "../../lib/display-helpers.js";
import { getNextMultipleHerdsPage } from "../../lib/get-next-multiple-herds-page.js";
import { claimRoutes, claimViews } from "../../constants/routes.js";

const getClaimInfo = (previousClaims, typeOfLivestock) => {
  let claimTypeText;
  let dateOfVisitText;
  let claimDateText;

  const previousClaimsForSpecies = previousClaims?.filter(
    (claim) => claim.data.typeOfLivestock === typeOfLivestock,
  );
  if (previousClaimsForSpecies && previousClaimsForSpecies.length > 0) {
    const {
      createdAt,
      data: { dateOfVisit, claimType },
    } = previousClaimsForSpecies.reduce((latest, claim) => {
      return claim.createdAt > latest.createdAt ? claim : latest;
    });

    claimTypeText = claimType === "R" ? "Review" : "Endemics";
    dateOfVisitText = new Date(dateOfVisit).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    claimDateText = new Date(createdAt).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  return {
    species: typeOfLivestock,
    claimType: claimTypeText,
    lastVisitDate: dateOfVisitText,
    claimDate: claimDateText,
  };
};

const getHandler = {
  method: "GET",
  path: "/same-herd",
  options: {
    tags: ["mh"],
    handler: async (request, h) => {
      const { typeOfLivestock, previousClaims, herdSame } = getSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
      );
      const herdOrFlock = getHerdOrFlock(typeOfLivestock);
      const claimInfo = getClaimInfo(previousClaims, typeOfLivestock);

      return h.view(claimViews.sameHerd, {
        backLink: claimRoutes.checkHerdDetails,
        ...claimInfo,
        herdOrFlock,
        herdSame,
      });
    },
  },
};

const postHandler = {
  method: "POST",
  ppath: "/same-herd",
  options: {
    validate: {
      payload: Joi.object({
        herdSame: Joi.string().valid("yes", "no").required(),
      }),
      failAction: async (request, h, err) => {
        request.logger.setBindings({ err });
        const { typeOfLivestock, previousClaims, herdSame } = getSessionData(
          request,
          sessionEntryKeys.endemicsClaim,
        );
        const herdOrFlock = getHerdOrFlock(typeOfLivestock);
        const claimInfo = getClaimInfo(previousClaims, typeOfLivestock);

        return h
          .view(claimViews.sameHerd, {
            ...request.payload,
            errorMessage: {
              text: `Select yes if it is the same ${herdOrFlock}`,
              href: "#herdSame",
            },
            backLink: claimRoutes.checkHerdDetails,
            ...claimInfo,
            herdOrFlock,
            herdSame,
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      },
    },
    handler: async (request, h) => {
      const { herdSame } = request.payload;
      const {
        herdSame: herdSameFromSession,
        previousClaims,
        typeOfReview,
        dateOfVisit,
        organisation,
        typeOfLivestock,
        latestVetVisitApplication: oldWorldApplication,
      } = getSessionData(request, sessionEntryKeys.endemicsClaim);

      if (herdSame !== herdSameFromSession) {
        removeSessionDataForSameHerdChange(request);
      }

      setSessionData(
        request,
        sessionEntryKeys.endemicsClaim,
        sessionKeys.endemicsClaim.herdSame,
        herdSame,
      );

      const { isReview, isEndemicsFollowUp } = getReviewType(typeOfReview);

      if (herdSame === "yes") {
        const prevClaims = previousClaims.filter(
          (claim) => claim.data.typeOfLivestock === typeOfLivestock,
        );

        const errorMessage = canMakeClaim({
          prevClaims,
          typeOfReview,
          dateOfVisit,
          organisation,
          typeOfLivestock,
          oldWorldApplication,
        });

        if (errorMessage) {
          // TODO - raise invalid data event

          return h
            .view(claimViews.sameHerdException, {
              backLink: claimRoutes.sameHerd,
              errorMessage,
              backToPageText:
                "If you entered the wrong date, you'll need to go back and enter the correct date.",
              backToPageMessage: `Enter the date the vet last visited your farm for this ${isReview ? "review" : "follow-up"}.`,
              backToPageLink: claimRoutes.dateOfVisit,
            })
            .code(HttpStatus.BAD_REQUEST)
            .takeover();
        }
      }

      if (herdSame === "no" && isEndemicsFollowUp) {
        // TODO - raise invalid data event

        return h
          .view(claimViews.sameHerdException, {
            backLink: claimRoutes.sameHerd,
            errorMessage:
              "You must have an approved review claim for the different herd or flock, before you can claim for a follow-up.",
            backToPageText:
              "If you have not claimed for the review yet, you will need to submit a claim and have the claim approved first.",
            backToPageMessage: "Claim for a review",
            backToPageLink: claimRoutes.whichTypeOfReview,
          })
          .code(HttpStatus.BAD_REQUEST)
          .takeover();
      }

      return h.redirect(getNextMultipleHerdsPage(request));
    },
  },
};

export const sameHerdHandlers = [getHandler, postHandler];

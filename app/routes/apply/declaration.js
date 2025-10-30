import joi from "joi";
import {
  sessionKeys,
  sessionEntryKeys,
  getSessionData,
  clearApplyRedirect,
  setSessionData,
  setSessionEntry,
} from "../../session/index.js";
import { userType } from "../../constants/constants.js";
import { config } from "../../config/index.js";
import { applyRoutes, applyViews } from "../../constants/routes.js";
import { StatusCodes } from "http-status-codes";
import { preApplyHandler } from "../../lib/pre-apply-handler.js";
import { createApplication } from "../../api-requests/application-api.js";

const resetFarmerApplyDataBeforeApplication = (application) => {
  delete application.agreeSpeciesNumbers;
  delete application.agreeSameSpecies;
  delete application.agreeMultipleSpecies;
  delete application.agreeVisitTimings;
};

const formatOrganisation = (organisation) => ({
  ...organisation,
  address: organisation.address.split(",").map((line) => line.trim()),
});

export const declarationRouteHandlers = [
  {
    method: "get",
    path: "/declaration",
    options: {
      pre: [{ method: preApplyHandler }],
      handler: async (request, h) => {
        const organisation = getSessionData(
          request,
          sessionEntryKeys.farmerApplyData,
          sessionKeys.farmerApplyData.organisation,
        );

        return h.view(applyViews.declaration, {
          backLink: applyRoutes.timings,
          latestTermsAndConditionsUri: `${config.latestTermsAndConditionsUri}?continue=true&backLink=/${applyRoutes.declaration}`,
          organisation: formatOrganisation(organisation),
        });
      },
    },
  },
  {
    method: "post",
    path: "/declaration",
    options: {
      validate: {
        payload: joi.object({
          offerStatus: joi.string().required().valid("accepted", "rejected"),
          terms: joi.string().when("offerStatus", {
            is: "accepted",
            then: joi.valid("agree").required(),
          }),
        }),
        failAction: async (request, h, _) => {
          const farmerApplyData = getSessionData(request, sessionEntryKeys.farmerApplyData);

          return h
            .view(applyViews.declaration, {
              backLink: `/${applyRoutes.timings}`,
              latestTermsAndConditionsUri: `${config.latestTermsAndConditionsUri}?continue=true&backLink=/${applyRoutes.declaration}`,
              errorMessage: {
                text: "Select yes if you have read and agree to the terms and conditions",
              },
              organisation: formatOrganisation(farmerApplyData.organisation),
            })
            .code(StatusCodes.BAD_REQUEST)
            .takeover();
        },
      },
      handler: async (request, h) => {
        setSessionData(
          request,
          sessionEntryKeys.farmerApplyData,
          sessionKeys.farmerApplyData.declaration,
          true,
        );
        setSessionData(
          request,
          sessionEntryKeys.farmerApplyData,
          sessionKeys.farmerApplyData.offerStatus,
          request.payload.offerStatus,
        );
        setSessionData(
          request,
          sessionEntryKeys.farmerApplyData,
          sessionKeys.farmerApplyData.confirmCheckDetails,
          "yes",
        );

        const farmerApplyData = getSessionData(request, sessionEntryKeys.farmerApplyData);
        const { organisation, reference: tempApplicationReference } = farmerApplyData;

        request.logger.setBindings({
          tempApplicationReference,
          sbi: organisation.sbi,
        });

        resetFarmerApplyDataBeforeApplication(farmerApplyData);

        const { applicationReference } = await createApplication(farmerApplyData);

        request.logger.setBindings({ applicationReference });

        if (applicationReference) {
          setSessionData(
            request,
            sessionEntryKeys.farmerApplyData,
            sessionKeys.farmerApplyData.reference,
            applicationReference,
          );
          setSessionEntry(
            request,
            sessionEntryKeys.tempApplicationReference,
            tempApplicationReference,
          );

          // TODO - track event for an agreement being created
          clearApplyRedirect(request);
        }

        if (request.payload.offerStatus === "rejected") {
          return h.view(applyViews.offerRejected, {
            offerRejected: true,
          });
        }

        if (!applicationReference) {
          throw new Error("Apply declaration returned a null application reference.");
        }

        return h.view(applyViews.confirmation, {
          reference: applicationReference,
          isNewUser: userType.NEW_USER === organisation.userType,
          latestTermsAndConditionsUri: config.latestTermsAndConditionsUri,
        });
      },
    },
  },
];

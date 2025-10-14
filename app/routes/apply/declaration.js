import joi from "joi";
import {
  sessionKeys,
  sessionEntryKeys,
  getSessionData,
  clearApplyRedirect,
  setSessionData,
} from "../../session/index.js";
import { userType } from "../../constants/constants.js";
import { config } from "../../config/index.js";
import { applyRoutes, applyViews } from "../../config/routes.js";
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

        if (!organisation) {
          throw new Error("No organisation found in session");
        }

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
          const application = getSessionData(request, sessionEntryKeys.farmerApplyData);

          return h
            .view(applyViews.declaration, {
              backLink: `/${applyRoutes.timings}`,
              latestTermsAndConditionsUri: `${config.latestTermsAndConditionsUri}?continue=true&backLink=/${applyRoutes.declaration}`,
              errorMessage: {
                text: "Select yes if you have read and agree to the terms and conditions",
              },
              organisation: formatOrganisation(application.organisation),
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

        const application = getSessionData(request, sessionEntryKeys.farmerApplyData);
        const tempApplicationReference = application.reference;

        request.logger.setBindings({
          tempApplicationReference,
          sbi: application.organisation.sbi,
        });

        resetFarmerApplyDataBeforeApplication(application);

        const { agreementReference } = await createApplication(application);

        request.logger.setBindings({ agreementReference });

        if (agreementReference) {
          setSessionData(
            request,
            sessionEntryKeys.farmerApplyData,
            sessionKeys.farmerApplyData.reference,
            agreementReference,
          );
          setSessionData(
            request,
            sessionEntryKeys.tempReference,
            sessionKeys.tempReference,
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

        if (!agreementReference) {
          throw new Error("Apply declaration returned a null application reference.");
        }

        return h.view(applyViews.confirmation, {
          reference: agreementReference,
          isNewUser: userType.NEW_USER === application.organisation.userType,
          latestTermsAndConditionsUri: config.latestTermsAndConditionsUri,
        });
      },
    },
  },
];

import joi from "joi";
import {
  sessionKeys,
  sessionEntryKeys,
  getSessionData,
  clearApplyRedirect,
  setSessionData,
} from "../../../session/index.js";
import { userType, JOURNEY } from "../../../constants/constants.js";
import { config } from "../../../config/index.js";
import { poultryApplyRoutes, poultryApplyViews } from "../../../constants/routes.js";
import { StatusCodes } from "http-status-codes";
import { createApplication } from "../../../api-requests/application-api.js";
import { createTempReference } from "../../../lib/create-temp-ref.js";
import { trackEvent } from "../../../logging/logger.js";
import { refreshApplications } from "../../../lib/context-helper.js";

const resetPoultryApplyDataBeforeApplication = (application) => {
  delete application.agreeSpeciesNumbers;
  delete application.agreeSameSpecies;
  delete application.agreeMultipleSpecies;
  delete application.agreeVisitTimings;
};

const formatOrganisation = (organisation) => ({
  ...organisation,
  address: organisation.address.split(",").map((line) => line.trim()),
});

const processRejectedApplication = async (h, request) => {
  // create new tempApplicationId as the current one has been used to create a rejected application
  const tempApplicationId = createTempReference({ referenceForClaim: false });

  request.logger.info(`Application rejected, created new temp reference: ${tempApplicationId}`);

  await setSessionData(
    request,
    sessionEntryKeys.poultryApplyData,
    sessionKeys.poultryApplyData.reference,
    tempApplicationId,
  );

  return h.view(poultryApplyViews.offerRejected, {
    offerRejected: true,
  });
};

export const poultryDeclarationRouteHandlers = [
  {
    method: "get",
    path: "/poultry/declaration",
    options: {
      handler: async (request, h) => {
        const organisation = getSessionData(request, sessionEntryKeys.organisation);

        return h.view(poultryApplyViews.declaration, {
          backLink: poultryApplyRoutes.timings,
          latestTermsAndConditionsUri: `${config.latestTermsAndConditionsUri}?continue=true&backLink=/${poultryApplyRoutes.declaration}`,
          organisation: formatOrganisation(organisation),
        });
      },
    },
  },
  {
    method: "post",
    path: "/poultry/declaration",
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
          const organisation = getSessionData(request, sessionEntryKeys.organisation);

          return h
            .view(poultryApplyViews.declaration, {
              backLink: poultryApplyRoutes.timings,
              latestTermsAndConditionsUri: `${config.latestTermsAndConditionsUri}?continue=true&backLink=/${poultryApplyRoutes.declaration}`,
              errorMessage: {
                text: "Select yes if you have read and agree to the terms and conditions",
              },
              organisation: formatOrganisation(organisation),
            })
            .code(StatusCodes.BAD_REQUEST)
            .takeover();
        },
      },
      handler: async (request, h) => {
        await setSessionData(
          request,
          sessionEntryKeys.poultryApplyData,
          sessionKeys.poultryApplyData.declaration,
          true,
        );
        await setSessionData(
          request,
          sessionEntryKeys.poultryApplyData,
          sessionKeys.poultryApplyData.offerStatus,
          request.payload.offerStatus,
        );
        await setSessionData(
          request,
          sessionEntryKeys.poultryApplyData,
          sessionKeys.poultryApplyData.confirmCheckDetails,
          "yes",
        );
        const poultryApplyData = getSessionData(request, sessionEntryKeys.poultryApplyData);
        const organisation = getSessionData(request, sessionEntryKeys.organisation);
        const { reference: tempApplicationReference } = poultryApplyData;

        request.logger.info(`Temp application reference: ${tempApplicationReference}`);

        resetPoultryApplyDataBeforeApplication(poultryApplyData);

        const { applicationReference } = await createApplication(
          { ...poultryApplyData, organisation },
          request.logger,
        );

        request.logger.info(`Created application: ${applicationReference}`);

        trackEvent(
          request.logger,
          "submit-application",
          `status: ${request.payload.offerStatus} sbi:${organisation.sbi}`,
          {
            reference: `applicationReference: ${applicationReference}, tempApplicationReference: ${tempApplicationReference}`,
          },
        );

        if (applicationReference) {
          await setSessionData(
            request,
            sessionEntryKeys.poultryApplyData,
            sessionKeys.poultryApplyData.reference,
            applicationReference,
          );
          await setSessionData(
            request,
            sessionEntryKeys.tempReference,
            sessionKeys.tempReference,
            tempApplicationReference,
            { journey: JOURNEY.APPLY },
          );
          clearApplyRedirect(request);
        }

        if (request.payload.offerStatus === "rejected") {
          return processRejectedApplication(h, request);
        }

        if (!applicationReference) {
          throw new Error("Apply declaration returned a null application reference.");
        }

        // refresh application
        await refreshApplications(organisation.sbi, request);

        return h.view(poultryApplyViews.confirmation, {
          reference: applicationReference,
          isNewUser: userType.NEW_USER === organisation.userType,
          latestTermsAndConditionsUri: config.latestTermsAndConditionsUri,
        });
      },
    },
  },
];

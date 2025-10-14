import { getOrganisationModel } from "./models/organisation.js";
import joi from "joi";
import { StatusCodes } from "http-status-codes";
import { getSessionData, sessionEntryKeys, sessionKeys } from "../session/index.js";
import { config } from "../config/index.js";
import { applyRoutes } from "../config/routes.js";

export const checkDetailsHandlers = [
  {
    method: "GET",
    path: "/check-details",
    options: {
      handler: async (request, h) => {
        const organisation = getSessionData(
          request,
          sessionEntryKeys.endemicsClaim,
          sessionKeys.endemicsClaim.organisation,
        );

        if (!organisation) {
          throw new Error("Organisation not in session.");
        }

        return h.view("check-details", getOrganisationModel(request, organisation));
      },
    },
  },
  {
    method: "POST",
    path: "/check-details",
    options: {
      validate: {
        payload: joi.object({
          confirmCheckDetails: joi.string().valid("yes", "no").required(),
        }),
        failAction: (request, h, err) => {
          request.logger.setBindings({ err });
          const organisation = getSessionData(
            request,
            sessionEntryKeys.endemicsClaim,
            sessionKeys.endemicsClaim.organisation,
          );

          if (!organisation) {
            throw new Error("Organisation not in session.");
          }

          return h
            .view("check-details", {
              errorMessage: { text: "Select if these details are correct" },
              ...getOrganisationModel(request, organisation, "Select if these details are correct"),
            })
            .code(StatusCodes.BAD_REQUEST)
            .takeover();
        },
      },
      handler: async (request, h) => {
        const { confirmCheckDetails } = request.payload;

        if (confirmCheckDetails === "yes") {
          const redirectToApply = getSessionData(
            request,
            sessionEntryKeys.signInRedirect,
            sessionKeys.signInRedirect,
          );

          if (redirectToApply === true) {
            return h.redirect(applyRoutes.youCanClaimMultiple);
          }

          return h.redirect("/vet-visits");
        }

        const organisation = getSessionData(
          request,
          sessionEntryKeys.endemicsClaim,
          sessionKeys.endemicsClaim.organisation,
        );

        return h.view("update-details", {
          devMode: config.devLogin.enabled,
          sfdButtonLink: `/sign-in?relationshipId=${organisation.id}`,
        });
      },
    },
  },
];

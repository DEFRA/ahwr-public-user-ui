import { getOrganisationModel } from "./models/organisation.js";
import { sessionKeys } from "../session/keys.js";
import joi from "joi";
import { StatusCodes } from "http-status-codes";
import { getEndemicsClaim, getSignInRedirect } from "../session/index.js";
import { applyServiceUri } from "../config/routes.js";
import { config } from "../config/index.js";

const { organisation: organisationKey } = sessionKeys.endemicsClaim;

export const checkDetailsHandlers = [
  {
    method: "GET",
    path: "/check-details",
    options: {
      handler: async (request, h) => {
        const organisation = getEndemicsClaim(request, organisationKey);

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
          const organisation = getEndemicsClaim(request, organisationKey);

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
          const redirectToApply = getSignInRedirect(request, sessionKeys.signInRedirect);

          if (redirectToApply === true) {
            return h.redirect(`${applyServiceUri}/endemics/you-can-claim-multiple`);
          }

          return h.redirect("/vet-visits");
        }

        const { organisation } = getEndemicsClaim(request);

        return h.view("update-details", {
          devMode: config.devLogin.enabled,
          sfdButtonLink: `/sign-in?relationshipId=${organisation.id}`,
        });
      },
    },
  },
];

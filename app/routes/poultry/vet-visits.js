import { getSessionData, sessionEntryKeys, sessionKeys } from "../../session/index.js";
import { requestAuthorizationCodeUrl } from "../../auth/auth-code-grant/request-authorization-code-url.js";
import { config } from "../../config/index.js";
import { poultryClaimRoutes } from "../../constants/routes.js";
import { refreshApplications } from "../../lib/context-helper.js";
import nunjucks from "nunjucks";
import { getClaimsByApplicationReference } from "../../api-requests/claim-api.js";
import { upperFirstLetter } from "../../lib/display-helpers.js";

const { latestTermsAndConditionsUri } = config;

const centringClass = "vertical-middle";

const createRowsForTable = (claims) => {
  const env = nunjucks.configure(["app/views/snippets", "node_modules/govuk-frontend/dist"]);

  return claims.map((claim) => {
    const dateOfVisit = new Date(claim.data.dateOfReview);
    const formattedDateOfVisit = dateOfVisit.toLocaleString("en-gb", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const typesOfPoultry = upperFirstLetter(
      claim.data.typesOfPoultry.join(", ").replaceAll("-", " "),
    );

    return [
      {
        text: formattedDateOfVisit,
        attributes: {
          "data-sort-value": dateOfVisit.getTime(),
        },
        classes: centringClass,
      },
      {
        text: claim.herd?.name,
        classes: centringClass,
      },
      {
        text: typesOfPoultry,
        classes: centringClass,
      },
      {
        text: claim.reference,
        classes: centringClass,
      },
      {
        html: env.render("tag.njk", { status: claim.status }),
        classes: centringClass,
      },
    ];
  });
};

const HEADERS = [
  {
    text: "Review date",
    attributes: {
      "aria-sort": "descending",
    },
    classes: "col-19",
  },
  {
    text: "Site name",
    attributes: {
      "aria-sort": "none",
    },
    classes: "col-44",
  },
  {
    text: "Type of poultry",
    attributes: {
      "aria-sort": "none",
    },
    classes: "col-25",
  },
  {
    text: "Claim number",
    attributes: {
      "aria-sort": "none",
    },
    classes: "col-25",
  },
  {
    text: "Status",
    attributes: {
      "aria-sort": "none",
    },
    classes: "col-12",
  },
];

const getOrRefreshApplication = async (request, sbi) => {
  const latestPoultryApplication = getSessionData(
    request,
    sessionEntryKeys.poultryClaim,
    sessionKeys.poultryClaim.latestPoultryApplication,
  );

  if (!latestPoultryApplication) {
    const { latestPoultryApplication: updatedApplication } = await refreshApplications(
      sbi,
      request,
    );
    return updatedApplication;
  }

  return latestPoultryApplication;
};

export const poultryVetVisitsHandlers = [
  {
    method: "GET",
    path: "/poultry/vet-visits",
    options: {
      handler: async (request, h) => {
        const organisation = getSessionData(request, sessionEntryKeys.organisation);

        const attachedToMultipleBusinesses = getSessionData(
          request,
          sessionEntryKeys.customer,
          sessionKeys.customer.attachedToMultipleBusinesses,
        );

        const application = await getOrRefreshApplication(request, organisation.sbi);

        const claims = application
          ? await getClaimsByApplicationReference(application.reference, request.logger)
          : [];

        const rows = createRowsForTable(claims);

        const downloadedDocument = `/download-application/${organisation.sbi}/${application.reference}`;

        return h.view("poultry/vet-visits", {
          attachedToMultipleBusinesses,
          claimJourneyStartPointUri: poultryClaimRoutes.dateOfReview,
          ...organisation,
          reference: application.reference,
          downloadedDocument,
          ...(attachedToMultipleBusinesses && {
            hostname: await requestAuthorizationCodeUrl(request),
          }),
          latestTermsAndConditionsUri,
          rows,
          headers: HEADERS,
        });
      },
    },
  },
];

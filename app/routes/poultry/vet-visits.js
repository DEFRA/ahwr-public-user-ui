import { getSessionData, sessionEntryKeys, sessionKeys } from "../../session/index.js";
import { getClaimsByApplicationReference } from "../../api-requests/claim-api.js";
import nunjucks from "nunjucks";
import { requestAuthorizationCodeUrl } from "../../auth/auth-code-grant/request-authorization-code-url.js";
import { config } from "../../config/index.js";
import { RPA_CONTACT_DETAILS, claimType } from "ffc-ahwr-common-library";
import { claimRoutes } from "../../constants/routes.js";
import { refreshApplications } from "../../lib/context-helper.js";

const { latestTermsAndConditionsUri } = config;

const centringClass = "vertical-middle";

const createRowsForTable = (claims) => {
  const env = nunjucks.configure(["app/views/snippets", "node_modules/govuk-frontend/dist"]);

  return claims.map((claim) => {
    const dateOfVisit = new Date(claim.data.dateOfVisit);
    const formattedDateOfVisit = dateOfVisit.toLocaleString("en-gb", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const claimTypeText =
      (claim.type ?? claimType.review) === claimType.review ? "Review" : "Follow-up";
    const herdName = claim.herd?.name;

    return [
      {
        text: formattedDateOfVisit,
        attributes: {
          "data-sort-value": dateOfVisit.getTime(),
        },
        classes: centringClass,
      },
      {
        text: herdName,
        classes: centringClass,
      },
      {
        html: `<div>
                <p class="govuk-!-margin-0">${claimTypeText}</p>
                <p class="govuk-caption-m govuk-!-margin-0">${claim.reference}</p>
              </div>`,
      },
      {
        html: env.render("tag.njk", { status: claim.status }),
        classes: centringClass,
      },
    ];
  });
};

const buildClaimRowsPerSpecies = (claims) => {
  const beefClaimsRows = createRowsForTable(
    claims.filter((claim) => claim.data.typeOfLivestock === "beef"),
  );
  const dairyClaimsRows = createRowsForTable(
    claims.filter((claim) => claim.data.typeOfLivestock === "dairy"),
  );
  const pigClaimsRows = createRowsForTable(
    claims.filter((claim) => claim.data.typeOfLivestock === "pigs"),
  );
  const sheepClaimsRows = createRowsForTable(
    claims.filter((claim) => claim.data.typeOfLivestock === "sheep"),
  );

  return { beefClaimsRows, dairyClaimsRows, pigClaimsRows, sheepClaimsRows };
};

const HEADERS = [
  {
    text: "Visit date",
    attributes: {
      "aria-sort": "descending",
    },
    classes: "col-19",
  },
  {
    text: "Unit name",
    attributes: {
      "aria-sort": "none",
    },
    classes: "col-44",
  },
  {
    text: "Type and claim number",
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

const getOrRefreshApplications = async (request, sbi) => {
  const latestPoultryApplication = getSessionData(
    request,
    sessionEntryKeys.poultryClaim,
    sessionKeys.poultryClaim.latestPoultryApplication,
  );

  if (!latestPoultryApplication) {
    const latestPoultryApplication = await refreshApplications(sbi, request);
    return latestPoultryApplication;
  }

  return latestPoultryApplication;
};

export const poultryVetVisitsHandlers = [
  {
    method: "GET",
    path: "/poultry/vet-visits",
    options: {
      handler: async (request, h) => {
        console.log("1");
        const organisation = getSessionData(request, sessionEntryKeys.organisation);

        const attachedToMultipleBusinesses = getSessionData(
          request,
          sessionEntryKeys.customer,
          sessionKeys.customer.attachedToMultipleBusinesses,
        );

        const application = await getOrRefreshApplications(request, organisation.sbi);

        if (application.redacted) {
          return h.view("agreement-redacted", {
            ruralPaymentsAgency: RPA_CONTACT_DETAILS,
            privacyPolicyUri: config.privacyPolicyUri,
          });
        }

        const claims = application
          ? await getClaimsByApplicationReference(application.reference, request.logger)
          : [];

        const { beefClaimsRows, dairyClaimsRows, pigClaimsRows, sheepClaimsRows } =
          buildClaimRowsPerSpecies(claims);

        const downloadedDocument = `/download-application/${organisation.sbi}/${application.reference}`;

        return h.view("poultry/vet-visits", {
          beefClaimsRows,
          dairyClaimsRows,
          pigClaimsRows,
          sheepClaimsRows,
          headers: HEADERS,
          attachedToMultipleBusinesses,
          claimJourneyStartPointUri: claimRoutes.whichSpeciesPoultry,
          ...organisation,
          reference: application.reference,
          downloadedDocument,
          ...(attachedToMultipleBusinesses && {
            hostname: await requestAuthorizationCodeUrl(request),
          }),
          latestTermsAndConditionsUri,
        });
      },
    },
  },
];

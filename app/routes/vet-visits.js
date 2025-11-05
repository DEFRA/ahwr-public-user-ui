import { getSessionData, sessionEntryKeys, sessionKeys } from "../session/index.js";
import { getClaimsByApplicationReference } from "../api-requests/claim-api.js";
import nunjucks from "nunjucks";
import { requestAuthorizationCodeUrl } from "../auth/auth-code-grant/request-authorization-code-url.js";
import { config } from "../config/index.js";
import { showMultiHerdsBanner } from "./utils/show-multi-herds-banner.js";
import { RPA_CONTACT_DETAILS, claimType, UNNAMED_FLOCK, UNNAMED_HERD } from "ffc-ahwr-common-library";
import { isWithin10MonthsFromNow } from "../lib/utils.js";
import { claimRoutes } from "../constants/routes.js";
import { SHEEP } from "../constants/claim-constants.js";

const { latestTermsAndConditionsUri } = config;

const centringClass = "vertical-middle";

const createRowsForTable = (claims) => {
  const env = nunjucks.configure(["app/views/snippets", "node_modules/govuk-frontend/dist"]);

  return claims.map((claim) => {
    const newClaimVisitDate = claim.data.dateOfVisit;
    const oldClaimVisitDate = claim.data.visitDate;
    const dateOfVisit = new Date(newClaimVisitDate || oldClaimVisitDate);
    const formattedDateOfVisit = dateOfVisit.toLocaleString("en-gb", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const claimTypeText =
      (claim.data.claimType ?? claimType.review) === claimType.review ? "Review" : "Follow-up";
    const herdName =
      claim.herd?.name ??
      (claim.data.typeOfLivestock === SHEEP ? UNNAMED_FLOCK : UNNAMED_HERD);

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

const buildClaimRowsPerSpecies = (allClaims, isOldWorld) => {
  const beefClaimsRows = createRowsForTable(
    allClaims.filter(
      (claim) => (isOldWorld ? claim.data.whichReview : claim.data.typeOfLivestock) === "beef",
    ),
  );
  const dairyClaimsRows = createRowsForTable(
    allClaims.filter(
      (claim) => (isOldWorld ? claim.data.whichReview : claim.data.typeOfLivestock) === "dairy",
    ),
  );
  const pigClaimsRows = createRowsForTable(
    allClaims.filter(
      (claim) => (isOldWorld ? claim.data.whichReview : claim.data.typeOfLivestock) === "pigs",
    ),
  );
  const sheepClaimsRows = createRowsForTable(
    allClaims.filter(
      (claim) => (isOldWorld ? claim.data.whichReview : claim.data.typeOfLivestock) === "sheep",
    ),
  );

  return { beefClaimsRows, dairyClaimsRows, pigClaimsRows, sheepClaimsRows };
};

const buildTableHeaders = () => {
  const sharedTableHeaders = [
    {
      text: "Visit date",
      attributes: {
        "aria-sort": "descending",
      },
      classes: "col-19",
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

  const sheepHeaders = [...sharedTableHeaders];

  sheepHeaders.splice(1, 0, {
    text: "Flock name",
    attributes: {
      "aria-sort": "none",
    },
    classes: "col-44",
  });

  const nonSheepHeaders = [...sharedTableHeaders];

  nonSheepHeaders.splice(1, 0, {
    text: "Herd name",
    attributes: {
      "aria-sort": "none",
    },
    classes: "col-44",
  });

  return { sheepHeaders, nonSheepHeaders };
};

export const vetVisitsHandlers = [
  {
    method: "GET",
    path: "/vet-visits",
    options: {
      handler: async (request, h) => {
        const organisation = getSessionData(
          request,
          sessionEntryKeys.endemicsClaim,
          sessionKeys.endemicsClaim.organisation,
        );

        request.logger.setBindings({ sbi: organisation.sbi });

        const attachedToMultipleBusinesses = getSessionData(
          request,
          sessionEntryKeys.customer,
          sessionKeys.customer.attachedToMultipleBusinesses,
        );
        const { latestEndemicsApplication, latestVetVisitApplication } = getSessionData(request, sessionEntryKeys.endemicsClaim);

        if (!latestEndemicsApplication) {
          throw new Error(
            "User should not be attempting to access this page without an agreement.",
          );
        }

        if (latestEndemicsApplication.redacted) {
          return h.view("agreement-redacted", {
            ruralPaymentsAgency: RPA_CONTACT_DETAILS,
            privacyPolicyUri: config.privacyPolicyUri,
          });
        }

        const claims = latestEndemicsApplication
          ? await getClaimsByApplicationReference(
              latestEndemicsApplication.reference,
              request.logger,
            )
          : [];

        const vetVisitApplicationsWithinLastTenMonths = latestVetVisitApplication ? (isWithin10MonthsFromNow(latestVetVisitApplication.data.visitDate) ? latestVetVisitApplication : undefined) : undefined;

        const allClaims = [...claims, vetVisitApplicationsWithinLastTenMonths].filter(Boolean);
        const isOldWorld = !latestEndemicsApplication; // TODO: Can't come in here now unless they have a new world agreement so some concept to retire here

        const { beefClaimsRows, dairyClaimsRows, pigClaimsRows, sheepClaimsRows } =
          buildClaimRowsPerSpecies(allClaims, isOldWorld);

        const downloadedDocument = `/download-application/${organisation.sbi}/${latestEndemicsApplication.reference}`;

        const showNotificationBanner = showMultiHerdsBanner(latestEndemicsApplication, claims);

        const { sheepHeaders, nonSheepHeaders } = buildTableHeaders();

        return h.view("vet-visits", {
          beefClaimsRows,
          dairyClaimsRows,
          pigClaimsRows,
          sheepClaimsRows,
          headers: {
            sheepHeaders,
            nonSheepHeaders,
          },
          showNotificationBanner,
          attachedToMultipleBusinesses,
          claimJourneyStartPointUri: claimRoutes.whichSpecies,
          ...organisation,
          ...(latestEndemicsApplication?.reference && {
            reference: latestEndemicsApplication.reference,
          }),
          ...(latestEndemicsApplication?.reference && { downloadedDocument }),
          ...(attachedToMultipleBusinesses && {
            hostname: requestAuthorizationCodeUrl(request),
          }),
          latestTermsAndConditionsUri,
        });
      },
    },
  },
];

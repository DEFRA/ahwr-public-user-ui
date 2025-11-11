import {
  sessionEntryKeys,
  setSessionData,
  sessionKeys,
  getSessionData,
} from "../../session/index.js";
import { getCphNumbers } from "./cph-numbers.js";
import {
  detailOrganisationRoles,
  getOrganisation,
  getOrganisationAuthorisation,
  organisationHasPermission,
} from "./organisation.js";
import { getPersonSummary } from "./person.js";

const formatOrganisationAddress = (address) => {
  return [
    address?.address1,
    address?.address2,
    address?.address3,
    address?.address4,
    address?.address5,
    address?.pafOrganisationName,
    address?.flatName,
    address?.buildingNumberRange,
    address?.buildingName,
    address?.street,
    address?.city,
    address?.county,
    address?.postalCode,
    address?.country,
  ]
    .filter(Boolean)
    .join(",");
};

const setOrganisationSessionData = (request, personSummary, org, crn) => {
  const organisation = {
    sbi: org.sbi?.toString(),
    farmerName: personSummary.name,
    name: org.name,
    orgEmail: org.email,
    email: personSummary.email ?? org.email,
    address: org.address,
    crn,
    id: org.id,
  };

  setSessionData(
    request,
    sessionEntryKeys.endemicsClaim,
    sessionKeys.endemicsClaim.organisation,
    organisation,
  );
  setSessionData(
    request,
    sessionEntryKeys.farmerApplyData,
    sessionKeys.farmerApplyData.organisation,
    organisation,
  );
};

export const getPersonAndOrg = async ({ request, apimAccessToken, crn, logger, accessToken }) => {
  const organisationId = accessToken.currentRelationshipId;
  const defraIdAccessToken = getSessionData(
    request,
    sessionEntryKeys.tokens,
    sessionKeys.tokens.accessToken,
  );

  const [
    personSummaryResult,
    organisationAuthorisationResult,
    organisationResult,
    cphNumbersResult,
  ] = await Promise.allSettled([
    getPersonSummary({ apimAccessToken, crn, logger, defraIdAccessToken }),
    getOrganisationAuthorisation({ organisationId, apimAccessToken, defraIdAccessToken }),
    getOrganisation({ organisationId, apimAccessToken, defraIdAccessToken }),
    getCphNumbers({ request, apimAccessToken, defraIdAccessToken }),
  ]);

  if (
    [
      personSummaryResult.status,
      organisationAuthorisationResult.status,
      organisationResult.status,
      cphNumbersResult.status,
    ].includes("rejected")
  ) {
    throw new AggregateError(
      [personSummaryResult, organisationAuthorisationResult, organisationResult]
        .filter((x) => x.status === "rejected")
        .map((x) => new Error(x.reason)),
      "Failed to retrieve person or organisation details",
    );
  }
  const personSummary = personSummaryResult.value;
  const organisationAuthorisation = organisationAuthorisationResult.value;
  const organisation = organisationResult.value;
  const cphNumbers = cphNumbersResult.value;
  const organisationPermission = organisationHasPermission({
    organisationAuthorisation,
    personId: personSummary.id,
  });

  detailOrganisationRoles({ organisationAuthorisation, personId: personSummary.id, logger });

  setSessionData(request, sessionEntryKeys.customer, sessionKeys.customer.id, personSummary.id);

  const personAndOrg = {
    orgDetails: {
      organisationPermission,
      organisation: {
        ...organisation,
        address: formatOrganisationAddress(organisation.address),
      },
    },
    personSummary,
  };

  setOrganisationSessionData(request, personSummary, personAndOrg.orgDetails.organisation, crn);

  return { ...personAndOrg, cphNumbers };
};

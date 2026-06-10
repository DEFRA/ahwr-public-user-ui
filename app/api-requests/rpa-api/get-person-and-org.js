import {
  sessionEntryKeys,
  setSessionData,
  sessionKeys,
  getSessionData,
  setSessionEntry,
} from "../../session/index.js";
import { getCphNumbers } from "./cph-numbers.js";
import {
  getOrganisationRole,
  getOrganisation,
  getOrganisationAuthorisation,
  organisationHasPermission,
} from "./organisation.js";
import { getPersonSummary } from "./person.js";

const formatOrganisationAddress = (address) => {
  const fields = address?.uprn
    ? [
        address?.pafOrganisationName,
        address?.flatName,
        address?.buildingName,
        address?.buildingNumberRange,
        address?.street,
        address?.dependentLocality,
        address?.doubleDependentLocality,
        address?.city,
        address?.county,
        address?.postalCode,
        address?.country,
      ]
    : [
        address?.address1,
        address?.address2,
        address?.address3,
        address?.address4,
        address?.address5,
        address?.city,
        address?.county,
        address?.postalCode,
        address?.country,
      ];
  return fields.filter(Boolean).join(",");
};

const setOrganisationSessionData = async (request, personSummary, org, crn) => {
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

  await setSessionEntry(request, sessionEntryKeys.organisation, organisation);
};

/**
 * Fetches person and organisation details in parallel and writes them to the session.
 *
 * @param {object} params
 * @param {import('@hapi/hapi').Request} params.request - Hapi request (used for session access)
 * @param {string} params.apimAccessToken - APIM bearer token
 * @param {number} params.crn - Customer Reference Number
 * @param {import('pino').Logger} params.logger - Pino logger instance
 * @param {{ currentRelationshipId: string }} params.accessToken - Defra ID access token containing the organisation relationship ID
 * @returns {Promise<{ personSummary: object, personRole: string, cphNumbers: string[]|null, orgDetails: { organisationPermission: boolean, organisation: object } }>}
 * @throws {AggregateError} When any of the parallel API calls fail
 */
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

  const personRole = getOrganisationRole({
    organisationAuthorisation,
    personId: personSummary.id,
    logger,
  });

  await setSessionData(
    request,
    sessionEntryKeys.customer,
    sessionKeys.customer.id,
    personSummary.id,
  );

  const personAndOrg = {
    orgDetails: {
      organisationPermission,
      organisation: {
        ...organisation,
        address: formatOrganisationAddress(organisation.address),
      },
    },
    personSummary,
    personRole,
  };

  await setOrganisationSessionData(
    request,
    personSummary,
    personAndOrg.orgDetails.organisation,
    crn,
  );

  return { ...personAndOrg, cphNumbers };
};

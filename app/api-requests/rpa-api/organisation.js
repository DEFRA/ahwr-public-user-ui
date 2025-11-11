import { sendRPAGetRequest } from "./send-get-request.js";
import { authConfig } from "../../config/auth.js";

const validPermissions = ["Submit - bps", "Full permission - business"];

export const getOrganisationAuthorisation = async ({
  organisationId,
  apimAccessToken,
  defraIdAccessToken,
}) => {
  const { getOrganisationPermissionsUrl } = authConfig.ruralPaymentsAgency;

  const response = await sendRPAGetRequest({
    url: getOrganisationPermissionsUrl.replace("organisationId", organisationId),
    defraIdAccessToken,
    headers: { Authorization: apimAccessToken },
  });
  return response?.data;
};

const permissionMatcher = (permissions, permissionToMatch) => {
  return permissions.every((value) => permissionToMatch.includes(value));
};

export const organisationHasPermission = ({ organisationAuthorisation, personId }) => {
  const personPrivileges = organisationAuthorisation.personPrivileges.filter(
    (privilege) => privilege.personId === personId,
  );

  return personPrivileges.some((privilege) =>
    permissionMatcher(privilege.privilegeNames, validPermissions),
  );
};

export const detailOrganisationRoles = ({ organisationAuthorisation, personId, logger }) => {
  try {
    organisationAuthorisation.personRoles
      .map((prEntry) => {
        return `${prEntry.personId} - ${prEntry.role}`;
      })
      .forEach((strRole) => {
        logger.info(`Found role for this business - ${strRole}`);
      });

    const ourRole = organisationAuthorisation.personRoles.find((prEntry) => {
      return prEntry.personId === personId;
    })?.role;
    logger.info(`Current user role is ${ourRole}`);
  } catch (error) {
    logger.error(
      { error: { message: error.message, stack: error.stack } },
      "Error detailing organisation roles",
    );
  }
};

export const getOrganisation = async ({ organisationId, apimAccessToken, defraIdAccessToken }) => {
  const { getOrganisationUrl } = authConfig.ruralPaymentsAgency;
  const response = await sendRPAGetRequest({
    url: getOrganisationUrl.replace("organisationId", organisationId),
    defraIdAccessToken,
    headers: { Authorization: apimAccessToken },
  });

  return response?._data;
};

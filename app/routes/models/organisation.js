import { getYesNoRadios } from "./form-component/yes-no-radios.js";
import { getSessionData, sessionEntryKeys, sessionKeys } from "../../session/index.js";
import { requestAuthorizationCodeUrl } from "../../auth/auth-code-grant/request-authorization-code-url.js";

const labelText = "Are these details correct?";

const formatAddressForDisplay = (organisation) => {
  return organisation?.address?.replaceAll(",", "<br>");
};

export const getOrganisationModel = async (request, organisation, errorText) => {
  const crn = getSessionData(request, sessionEntryKeys.customer, sessionKeys.customer.crn);

  // TODO remove after poultry release
  const rows = [
    { key: { text: "Farmer name" }, value: { text: organisation.farmerName } },
    { key: { text: "Business name" }, value: { text: organisation.name } },
    { key: { text: "CRN number" }, value: { text: crn } },
    { key: { text: "SBI number" }, value: { text: organisation.sbi } },
    { key: { text: "Organisation email address" }, value: { text: organisation.orgEmail } },
    { key: { text: "User email address" }, value: { text: organisation.email } },
    { key: { text: "Address" }, value: { html: formatAddressForDisplay(organisation) } },
  ];

  const businessRows = [
    { key: { text: "Business name" }, value: { text: organisation.name } },
    { key: { text: "Single business identifier (SBI)" }, value: { text: organisation.sbi } },
    { key: { text: "Business address" }, value: { html: formatAddressForDisplay(organisation) } },
    { key: { text: "Business email address" }, value: { text: organisation.orgEmail } },
  ];

  const personalRows = [
    { key: { text: "Full name" }, value: { text: organisation.farmerName } },
    { key: { text: "Customer reference number (CRN)" }, value: { text: crn } },
    { key: { text: "Personal email address" }, value: { text: organisation.email } },
  ];

  return {
    backLink: {
      href: await requestAuthorizationCodeUrl(request),
    },
    organisation,
    listData: { rows }, // TODO remove after poultry release
    businessListData: { rows: businessRows },
    personalListData: { rows: personalRows },
    ...getYesNoRadios(labelText, "confirmCheckDetails", undefined, errorText, {
      isPageHeading: false,
      legendClasses: "govuk-fieldset__legend--m",
      inline: true,
    }),
  };
};

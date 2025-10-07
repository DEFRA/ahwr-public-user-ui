import { getYesNoRadios } from "./form-component/yes-no-radios.js";
import { getCustomer } from "../../session/index.js";
import { requestAuthorizationCodeUrl } from "../../auth/auth-code-grant/request-authorization-code-url.js";

const labelText = "Are these details correct?";

const formatAddressForDisplay = (organisation) => {
  return organisation?.address?.replaceAll(",", "<br>");
};

export const getOrganisationModel = (request, organisation, errorText) => {
  const { crn } = getCustomer(request);
  request.logger.setBindings({ crn });

  const rows = [
    { key: { text: "Farmer name" }, value: { text: organisation.farmerName } },
    { key: { text: "Business name" }, value: { text: organisation.name } },
    { key: { text: "CRN number" }, value: { text: crn } },
    { key: { text: "SBI number" }, value: { text: organisation.sbi } },
    { key: { text: "Organisation email address" }, value: { text: organisation.orgEmail } },
    { key: { text: "User email address" }, value: { text: organisation.email } },
    { key: { text: "Address" }, value: { html: formatAddressForDisplay(organisation) } },
  ];

  return {
    backLink: {
      href: requestAuthorizationCodeUrl(request),
    },
    organisation,
    listData: { rows },
    ...getYesNoRadios(labelText, "confirmCheckDetails", errorText, {
      isPageHeading: false,
      legendClasses: "govuk-fieldset__legend--m",
      inline: true,
    }),
  };
};

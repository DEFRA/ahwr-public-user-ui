export function getYesNoRadios(
  legendText,
  id,
  previousAnswer,
  errorText = undefined,
  options = {},
) {
  const {
    isPageHeading = true,
    legendClasses = "govuk-fieldset__legend--l",
    inline = false,
    hintText = "",
  } = options;
  return {
    radios: {
      classes: inline ? "govuk-radios--inline" : undefined,
      idPrefix: id,
      name: id,
      fieldset: {
        legend: {
          text: legendText,
          isPageHeading,
          classes: legendClasses,
        },
      },
      hint: {
        text: hintText,
      },
      items: [
        {
          value: "yes",
          text: "Yes",
          checked: previousAnswer === "yes",
        },
        {
          value: "no",
          text: "No",
          checked: previousAnswer === "no",
        },
      ],
      ...(errorText ? { errorMessage: { text: errorText } } : {}),
    },
  };
}

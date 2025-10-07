import { getYesNoRadios } from "../../../../../../app/routes/models/form-component/yes-no-radios.js";

describe("getYesNoRadios", () => {
  const legendText = "Do you agree?";
  const id = "agree";
  const options = {
    isPageHeading: false,
    legendClasses: "custom-class",
    inline: true,
    hintText: "Hint text",
  };

  test("should return correct structure with default options", () => {
    const result = getYesNoRadios(legendText, id);

    expect(result).toEqual({
      radios: {
        classes: undefined, // Not inline by default
        idPrefix: id,
        name: id,
        fieldset: {
          legend: {
            text: legendText,
            isPageHeading: true, // Default value
            classes: "govuk-fieldset__legend--l", // Default value
          },
        },
        hint: {
          text: "", // Default empty string
        },
        items: [
          { value: "yes", text: "Yes" },
          { value: "no", text: "No" },
        ],
      },
    });
  });

  test("should handle custom options and error text", () => {
    const errorText = "Error message";
    const result = getYesNoRadios(legendText, id, errorText, options);

    expect(result).toEqual({
      radios: {
        classes: "govuk-radios--inline", // Inline due to options
        idPrefix: id,
        name: id,
        fieldset: {
          legend: {
            text: legendText,
            isPageHeading: options.isPageHeading,
            classes: options.legendClasses,
          },
        },
        hint: {
          text: options.hintText,
        },
        items: [
          { value: "yes", text: "Yes" },
          { value: "no", text: "No" },
        ],
        errorMessage: {
          text: errorText,
        },
      },
    });
  });

  test("should correctly handle no previous answer", () => {
    const result = getYesNoRadios(legendText, id, undefined, undefined, options);

    expect(result.radios.items[0].checked).toBeFalsy();
    expect(result.radios.items[1].checked).toBeFalsy();
  });
});

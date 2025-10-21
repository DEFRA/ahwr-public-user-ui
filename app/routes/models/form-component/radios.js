export function radios (legendText, id, errorText = undefined, options = {}) {
  return (items) => {
    const { isPageHeading = true, legendClasses = 'govuk-fieldset__legend--l', inline = false, hintHtml = '' } = options
    return {
      radios: {
        classes: inline ? 'govuk-radios--inline' : undefined,
        idPrefix: id,
        name: id,
        fieldset: {
          legend: {
            text: legendText,
            isPageHeading,
            classes: legendClasses
          }
        },
        hint: {
          html: hintHtml
        },
        items,
        ...(errorText ? { errorMessage: { text: errorText } } : {})
      }
    }
  }
}

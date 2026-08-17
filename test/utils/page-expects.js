export function errors($, expectedMessage) {
  expect($(".govuk-form-group--error")).toHaveLength(1);
  expect($(".govuk-error-message")).toHaveLength(1);
  expect($(".govuk-error-message").eq(0).text()).toMatch(expectedMessage);
}

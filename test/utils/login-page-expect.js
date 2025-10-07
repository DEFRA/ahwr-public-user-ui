export function hasCorrectContent($, pageType) {
  const hintText =
    "We'll use this to send you a link to apply for a review. This must be the business email address linked to the business applying for a review.";
  expect($("h1").text()).toMatch("Enter your email address");
  expect($("label[for=email]").text()).toMatch("Enter your email address");
  expect($("#email-hint").text()).toMatch(hintText);
}

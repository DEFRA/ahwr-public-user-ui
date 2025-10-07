window.onload = function () {
  const submitDeclarationForm = document.querySelector("#submitDeclarationForm");
  const registrationOfInterestForm = document.querySelector("#registrationOfInterestForm");
  preventDuplicateFormSubmission(submitDeclarationForm);
  preventDuplicateFormSubmission(registrationOfInterestForm);
};

function preventDuplicateFormSubmission(form) {
  if (form) {
    form.addEventListener("submit", function (e) {
      if (form.dataset.formSubmitted) {
        e.preventDefault();
      } else {
        form.dataset.formSubmitted = true;
      }
    });
  }
}

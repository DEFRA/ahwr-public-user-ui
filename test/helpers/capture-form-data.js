export const captureFormData = (name) => {
  let formdata = null;

  document.addEventListener("submit", function (event) {
    event.preventDefault();
    const form = new global.window.FormData(event.target);
    formdata = Object.fromEntries(form);
  });

  return { formdata: () => formdata };
};

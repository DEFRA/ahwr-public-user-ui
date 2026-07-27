export const devRedirectPlugin = {
  plugin: {
    name: "dev-redirect",
    register: (server, _) => {
      server.ext("onPreResponse", (request, h) => {
        if (request.path === "/check-details") {
          const response = request.response;
          const headers = response.isBoom ? response.output.headers : response.headers;
          const csp = headers["content-security-policy"];

          if (csp) {
            headers["content-security-policy"] = csp.replace("form-action 'self'", "form-action *");
          }
        }

        return h.continue;
      });
    },
  },
};

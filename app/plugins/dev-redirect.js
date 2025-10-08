export const devRedirectPlugin = {
  plugin: {
    name: "dev-redirect",
    register: (server, _) => {
      server.ext("onPreResponse", (request, h) => {
        if (request.path === "/check-details") {
          const response = h.request.response;
          response.headers["content-security-policy"] = response.headers[
            "content-security-policy"
          ].replace("form-action 'self'", "form-action *");
        }
        return h.request.response;
      });
    },
  },
};

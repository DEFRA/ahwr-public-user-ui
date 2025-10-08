import { config } from "../config/index.js";

const { serviceName, claimServiceUri, serviceUri, customerSurvey } = config;

export const viewContextPlugin = {
  plugin: {
    name: "view-context",
    register: (server, _) => {
      server.ext("onPreResponse", function (request, h) {
        const response = request.response;

        if (response.variety === "view") {
          const ctx = response.source.context || {};

          const { path } = request;

          let serviceUrl = "/";

          if (path.startsWith("/cookies")) {
            serviceUrl = "/cookies";
          }

          ctx.serviceName = serviceName;
          ctx.serviceUrl = serviceUrl;
          ctx.claimServiceUri = claimServiceUri;
          ctx.serviceUri = serviceUri;
          ctx.customerSurveyUri = customerSurvey.uri;
          ctx.userIsSignedIn = request.auth.isAuthenticated;

          response.source.context = ctx;
        }

        return h.continue;
      });
    },
  },
};

import { StatusCodes } from "http-status-codes";

export const errorPagesPlugin = {
  plugin: {
    name: "error-pages",
    register: (server, _) => {
      server.ext("onPreResponse", (request, h) => {
        const { response } = request;

        if (response.isBoom) {
          const { payload } = response.output;
          const { statusCode, message } = payload;

          const error = new Error(message);
          error.stack = response.data ? response.data.stack : response.stack;
          request.logger.error({
            statusCode,
            error,
          });

          if (statusCode === StatusCodes.NOT_FOUND) {
            // handled specifically by a route handler that renders a 404 page for unknown pages. This allows us to still track which user it is
            return h.continue;
          }

          if (
            statusCode >= StatusCodes.BAD_REQUEST &&
            statusCode < StatusCodes.INTERNAL_SERVER_ERROR
          ) {
            return h.view("error-pages/4xx", { payload }).code(statusCode);
          }

          return h.view("error-pages/500").code(statusCode);
        }

        return h.continue;
      });
    },
  },
};

import { sessionEntryKeys, getSessionData } from "../session/index.js";

const addBindings = (request) => {
  const organisation = getSessionData(request, sessionEntryKeys.organisation);

  if (organisation?.sbi) {
    request.logger = request.logger.child({
      tenant: { id: organisation?.sbi },
    });
  }
};

export const loggingContextPlugin = {
  plugin: {
    name: "logging-context",
    register: (server, _) => {
      server.ext("onPostAuth", (request, h) => {
        if (!request.path.includes("assets") && !request.path.includes("health")) {
          addBindings(request);
        }

        return h.continue;
      });
    },
  },
};

const getHandler = {
  method: "GET",
  path: "/select-the-site",
  handler: async (_request, h) => {
    return h.response().code(204);
  },
};

const postHandler = {
  method: "POST",
  path: "/select-the-site",
  handler: async (_request, _h) => {},
};

export const poultrySelectTheSiteHandlers = [getHandler, postHandler];

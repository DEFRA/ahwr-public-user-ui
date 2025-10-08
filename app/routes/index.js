export const entryPointHandlers = [
  {
    method: "GET",
    path: "/",
    options: {
      handler: async (_request, h) => {
        return h.redirect("/vet-visits");
      },
    },
  },
];

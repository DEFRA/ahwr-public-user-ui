export const updateDetailsHandlers = [
  {
    method: "GET",
    path: "/update-details",
    options: {
      handler: async (_, h) => {
        return h.view("update-details");
      },
    },
  },
];

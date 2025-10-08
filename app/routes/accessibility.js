export const accessibilityRouteHandlers = [
  {
    method: "GET",
    path: "/accessibility",
    options: {
      auth: { mode: "try" },
      handler: async (_, h) => {
        return h.view("accessibility");
      },
    },
  },
];

export const healthHandlers = [
  {
    method: "GET",
    path: "/health",
    options: {
      auth: false,
      plugins: {
        yar: { skip: true },
      },
    },
    handler: (_request, h) => {
      return h.response("ok").code(200);
    },
  },
];

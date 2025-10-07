export const healthHandlers = [
  {
    method: "GET",
    path: "/healthy",
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
  {
    method: "GET",
    path: "/healthz",
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

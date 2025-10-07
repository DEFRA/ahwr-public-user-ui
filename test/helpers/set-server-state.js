export const setServerState = async (server, state) => {
  server.ext("onPostAuth", (request, h) => {
    request.yar.set(state);
    return h.continue;
  });

  await server.initialize();

  server.ext("onPostResponse", async () => {
    await server.stop();
  });
};

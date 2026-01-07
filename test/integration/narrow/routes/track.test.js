import { createServer } from "../../../../app/server.js";

test("get /track1", async () => {
  const server = await createServer();
  const res = await server.inject({
    url: "/track1",
  });

  expect(res.statusCode).toBe(200);
});

test("get /track2", async () => {
  const server = await createServer();
  const res = await server.inject({
    url: "/track2",
  });

  expect(res.statusCode).toBe(200);
});

test("get /track3", async () => {
  const server = await createServer();
  const res = await server.inject({
    url: "/track3",
  });

  expect(res.statusCode).toBe(200);
});

test("get /track4", async () => {
  const server = await createServer();
  const res = await server.inject({
    url: "/track4",
  });

  expect(res.statusCode).toBe(200);
});

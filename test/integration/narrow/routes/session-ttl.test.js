import { createServer } from "../../../../app/server.js";

const getSetCookie = (res, name) => {
  return (res.headers["set-cookie"] ?? []).find((cookie) => cookie.startsWith(`${name}=`));
};

const getMaxAge = (setCookieValue) => {
  const match = /Max-Age=(\d+)/i.exec(setCookieValue);
  return match ? Number.parseInt(match[1], 10) : undefined;
};

describe("session TTL", () => {
  let server;
  let response;

  beforeAll(async () => {
    server = await createServer();
    await server.initialize();
    response = await server.inject({ method: "GET", url: "/accessibility" });
  });

  afterAll(async () => {
    await server.stop();
  });

  test("the session cookie is issued with a max-age", () => {
    const expectedMagAgeSeconds = Number.parseInt(process.env.SESSION_TIMEOUT_MILLISECONDS) / 1000;
    const authCookie = getSetCookie(response, "ahwr_session");

    expect(authCookie).toBeDefined();
    expect(getMaxAge(authCookie)).toBe(expectedMagAgeSeconds);
  });
});

describe("session expiry redirect behaviour", () => {
  let server;

  beforeAll(async () => {
    server = await createServer();
    await server.initialize();
  });

  afterAll(async () => {
    await server.stop();
  });

  test("GET request to a protected route without a session redirects to sign-in", async () => {
    const response = await server.inject({ method: "GET", url: "/select-funding" });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe("/sign-in");
  });

  test("POST request to a protected route without a session redirects to sign-in", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/select-funding",
      payload: { selectedFunding: "beef-cattle" },
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers.location).toBe("/sign-in");
  });
});

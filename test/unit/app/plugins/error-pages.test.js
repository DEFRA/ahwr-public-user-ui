import Hapi from "@hapi/hapi";
import Boom from "@hapi/boom";
import { errorPagesPlugin } from "../../../../app/plugins/error-pages.js";

describe("Error Pages Plugin", () => {
  let server;

  beforeAll(async () => {
    server = Hapi.server();
    await server.register(errorPagesPlugin);
    server.route([
      {
        method: "GET",
        path: "/success",
        handler: () => "Success",
      },
      {
        method: "GET",
        path: "/client-error",
        handler: () => Boom.badRequest("Client Error"),
      },
      {
        method: "GET",
        path: "/server-error",
        handler: () => Boom.badImplementation("Server Error"),
      },
    ]);
  });

  test("continues with non-error response", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/success",
    });

    expect(response.statusCode).toBe(200);
    expect(response.result).toBe("Success");
  });

  test("renders 500 error page for server errors", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/server-error",
    });

    expect(response.statusCode).toBe(500);
    // This test assumes the 500 error page doesn't specifically include the error message
    // Adjust the expectation based on your actual 500 error page content
    expect(response.result.error).toContain("Internal Server Error");
  });

  test("renders default error page for non-Boom errors", async () => {
    server.route({
      method: "GET",
      path: "/non-boom-error",
      handler: () => {
        throw new Error("Non-Boom Error");
      },
    });

    const response = await server.inject({
      method: "GET",
      url: "/non-boom-error",
    });

    expect(response.statusCode).toBe(500);
    // Adjust based on your 500 error page content
    expect(response.result.message).toContain("An internal server error occurred");
  });

  test("continues for non-error responses", async () => {
    server.route({
      method: "GET",
      path: "/not-an-error",
      handler: () => "Not an error",
    });

    const response = await server.inject({
      method: "GET",
      url: "/not-an-error",
    });

    expect(response.statusCode).toBe(200);
    expect(response.result).toBe("Not an error");
  });

  // This test ensures that the plugin does not interfere with successful responses
  test("does not alter successful responses", async () => {
    const testRoutePath = "/test-success";
    const successMessage = "Success response";
    server.route({
      method: "GET",
      path: testRoutePath,
      handler: () => successMessage,
    });

    const response = await server.inject({
      method: "GET",
      url: testRoutePath,
    });

    expect(response.statusCode).toBe(200);
    expect(response.result).toBe(successMessage);
  });
});

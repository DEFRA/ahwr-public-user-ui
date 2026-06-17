/**
 * @jest-environment node
 */
import globalJsdom from "global-jsdom";

describe("global-jsdom reuse after cleanup", () => {
  let cleanup;

  afterEach(() => {
    if (cleanup) {
      cleanup();
      cleanup = undefined;
    }
  });

  test("leaves Node performance and timer globals defined after cleanup", () => {
    const teardown = globalJsdom("<p>first</p>");

    teardown();

    expect(performance).toBeDefined();
    expect(setTimeout).toBeDefined();
    expect(clearTimeout).toBeDefined();
    expect(setInterval).toBeDefined();
    expect(clearInterval).toBeDefined();
  });

  test("renders a second document when globalJsdom is reused after cleanup", () => {
    const firstTeardown = globalJsdom("<p>first</p>");
    firstTeardown();

    cleanup = globalJsdom('<p id="marker">second</p>');

    expect(document.getElementById("marker").textContent).toBe("second");
  });

  test("leaves the real Node setTimeout in place so timers still fire after setup", async () => {
    cleanup = globalJsdom("<p>first</p>");

    await expect(new Promise((resolve) => setTimeout(() => resolve("fired"), 0))).resolves.toBe(
      "fired",
    );
  });
});

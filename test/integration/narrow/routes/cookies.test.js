import { captureFormData } from "../../../helpers/capture-form-data.js";
import { userEvent } from "@testing-library/user-event";
import { createServer } from "../../../../app/server.js";
import { getByRole } from "@testing-library/dom";
import globalJsdom from "global-jsdom";

describe("cookies tests", () => {
  let server;
  let cleanUpFunction;

  beforeAll(async () => {
    server = await createServer();
  });

  test("get /cookies", async () => {
    const policy = {
      confirmed: true,
      essential: true,
      analytics: false,
    };

    const cookie = Buffer.from(JSON.stringify(policy)).toString("base64");

    const res = await server.inject({
      url: "/cookies",
      headers: {
        cookie: `ahwr_cookie_policy=${cookie}`,
      },
    });

    cleanUpFunction = globalJsdom(res.payload);

    const user = userEvent.setup({ document });
    const { formdata } = captureFormData();

    const yes = getByRole(document.body, "radio", { name: "Yes" });
    const submit = getByRole(document.body, "button", {
      name: "Save cookie settings",
    });

    await user.click(submit);
    expect(formdata()).toEqual({
      analytics: "false",
      async: "false",
    });

    await user.click(yes);
    await user.click(submit);
    expect(formdata()).toEqual({
      analytics: "true",
      async: "false",
    });
  });

  test("get /cookies: defaults to false", async () => {
    cleanUpFunction();
    const res = await server.inject({
      url: "/cookies",
    });

    globalJsdom(res.payload);

    const user = userEvent.setup({ document });
    const { formdata } = captureFormData();

    const submit = getByRole(document.body, "button", {
      name: "Save cookie settings",
    });

    await user.click(submit);
    expect(formdata()).toEqual({
      analytics: "false",
      async: "false",
    });
  });

  test("post /cookies: from banner, async true", async () => {
    const res = await server.inject({
      url: "/cookies",
      method: "post",
      payload: {
        analytics: "true",
        async: "true",
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.payload).toBe("ok");
  });

  test("post /cookies: from page, async false", async () => {
    const res = await server.inject({
      url: "/cookies",
      method: "post",
      payload: {
        analytics: "true",
        async: "false",
      },
    });

    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe("/cookies?updated=true");
  });
});

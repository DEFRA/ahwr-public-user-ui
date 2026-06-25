import * as cheerio from "cheerio";
import { createServer } from "../../../../app/server.js";
import { axe } from "../../../helpers/axe-helper.js";
import { ok as phaseBannerOk } from "../../../utils/phase-banner-expect.js";

const serviceName = "Get funding to improve animal health and welfare";

describe("Base layout (GOV.UK Frontend v6)", () => {
  let server;
  let response;
  let $;

  beforeAll(async () => {
    server = await createServer();
    await server.initialize();
    response = await server.inject({ method: "GET", url: "/accessibility" });
    $ = cheerio.load(response.payload);
  });

  afterAll(async () => {
    await server.stop();
  });

  test("renders successfully with no accessibility violations", async () => {
    expect(response.statusCode).toBe(200);
    expect(await axe(response.payload)).toHaveNoViolations();
  });

  test("references the favicon at the v6 assets path", () => {
    expect(response.payload).toContain("/assets/images/favicon.ico");
  });

  test("no longer references the removed v5 rebrand asset folder", () => {
    expect(response.payload).not.toContain("/assets/rebrand/");
  });

  test("renders the GOV.UK header", () => {
    expect($(".govuk-header").length).toBeGreaterThan(0);
  });

  test("renders the service navigation with the service name", () => {
    expect($(".govuk-service-navigation").text()).toContain(serviceName);
  });

  test("renders the footer with the accessibility and cookies links", () => {
    expect($('.govuk-footer a[href="/accessibility"]').length).toBe(1);
    expect($('.govuk-footer a[href="/cookies"]').length).toBe(1);
  });

  test("renders the beta phase banner", () => {
    phaseBannerOk($);
  });
});

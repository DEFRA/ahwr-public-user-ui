import { load } from "cheerio";

/**
 * Registers the "Shows the browser page title" test for a page.
 *
 * @param {object} args
 * @param {string} args.title - text expected within the browser <title>.
 * @param {() => Promise<{ payload: string }>} args.getResponse - returns the
 *   rendered GET response. Any per-page mock setup should happen here.
 */
export const testBrowserPageTitle = ({ title, getResponse }) => {
  test("Shows the browser page title", async () => {
    const $ = load((await getResponse()).payload);
    expect($("title").text()).toContain(title);
  });
};

/**
 * Registers the "Shows the page heading" test for a page.
 *
 * @param {object} args
 * @param {string} args.heading - text expected as the page <h1>.
 * @param {() => Promise<{ payload: string }>} args.getResponse - returns the
 *   rendered GET response. Any per-page mock setup should happen here.
 */
export const testPageHeading = ({ heading, getResponse }) => {
  test("Shows the page heading", async () => {
    const $ = load((await getResponse()).payload);
    expect($("h1").text().trim()).toBe(heading);
  });
};

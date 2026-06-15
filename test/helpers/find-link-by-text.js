export const findLinkByText = ($, text) => $("a").filter((_, el) => $(el).text().trim() === text);

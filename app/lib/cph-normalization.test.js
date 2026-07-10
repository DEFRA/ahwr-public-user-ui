import { normalizeCphNumber } from "./cph-normalization.js";

describe("Normalization of cph number", () => {
  it.each([
    ["returns undefined unchanged", undefined, undefined],
    ["returns null unchanged", null, null],
    ["returns proper number unchanged", "12/123/1234", "12/123/1234"],
    ["strips spaces at the beginning", " 12/123/1234", "12/123/1234"],
    ["strips spaces at the end", "12/123/1234 ", "12/123/1234"],
    ["strips spaces in the middle", "12 / 12   3/1 2 3 4", "12/123/1234"],
    ["adds delimiters if none present", "121231234", "12/123/1234"],
    ["normalize delimiters if present", "12-123-1234", "12/123/1234"],
    ["returns original if delimiters are not matched", " 12-1 23%1234", " 12-1 23%1234"],
  ])("%s", (_name, input, expected) => {
    const actual = normalizeCphNumber(input);

    expect(actual).toBe(expected);
  });
});

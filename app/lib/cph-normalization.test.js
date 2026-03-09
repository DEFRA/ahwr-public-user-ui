import { normalizeCphNumber } from "./cph-normalization";

describe("Normalization of cph number", () => {
  it("returns undefined unchanged", () => {
    const actual = normalizeCphNumber(undefined);

    const expected = undefined;

    expect(actual).toBe(expected);
  });

  it("returns null unchanged", () => {
    const actual = normalizeCphNumber(null);

    const expected = null;

    expect(actual).toBe(expected);
  });

  it("returns proper number unchanged", () => {
    const actual = normalizeCphNumber("12/123/1234");

    const expected = "12/123/1234";

    expect(actual).toBe(expected);
  });

  it("strips spaces at the beginning", () => {
    const actual = normalizeCphNumber(" 12/123/1234");

    const expected = "12/123/1234";

    expect(actual).toBe(expected);
  });

  it("strips spaces at the end", () => {
    const actual = normalizeCphNumber("12/123/1234 ");

    const expected = "12/123/1234";

    expect(actual).toBe(expected);
  });

  it("strips spaces at the middle", () => {
    const actual = normalizeCphNumber("12 / 12   3/1 2 3 4");

    const expected = "12/123/1234";

    expect(actual).toBe(expected);
  });

  it("strips spaces at the middle", () => {
    const actual = normalizeCphNumber("12 / 12 3/1 2 3 4");

    const expected = "12/123/1234";

    expect(actual).toBe(expected);
  });

  it("adds delimiters if none present", () => {
    const actual = normalizeCphNumber("121231234");

    const expected = "12/123/1234";

    expect(actual).toBe(expected);
  });

  it("normalize delimiters if present", () => {
    const actual = normalizeCphNumber("12-123-1234");

    const expected = "12/123/1234";

    expect(actual).toBe(expected);
  });

  it("returns original if delimiters are not matched", () => {
    const actual = normalizeCphNumber(" 12-1 23%1234");

    const expected = " 12-1 23%1234";

    expect(actual).toBe(expected);
  });
});

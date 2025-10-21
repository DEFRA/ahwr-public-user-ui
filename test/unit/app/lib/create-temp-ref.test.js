import {
  createTempReference,
} from "../../../../app/lib/create-temp-ref.js";

describe("createTempReference for apply references", () => {
  test("should return a string temp reference", () => {
    const tempRef = createTempReference();

    expect(typeof tempRef).toBe("string");
    // A-Z excluding O, and 1-9
    const regex = /^TEMP-[A-NP-Z1-9]{4}-[A-NP-Z1-9]{4}$/;
    expect(tempRef).toMatch(regex);
  });

  test("should not generate the same ID twice in 20,000 IDs", () => {
    const ids = [];
    const numberToCreate = 20000;

    for (let index = 0; index < numberToCreate; index++) {
      ids.push(createTempReference());
    }

    expect(ids.length).toEqual(numberToCreate);

    const set = new Set(ids);

    expect(set.size).toEqual(numberToCreate);
  });
});

describe("createTempReference for claim references", () => {
  test('should return a string temp reference', () => {
    const tempRef = createTempReference({ referenceForClaim: true })

    expect(typeof tempRef).toBe('string')
    const regex = /^TEMP-CLAIM-[A-NP-Z1-9]{4}-[A-NP-Z1-9]{4}$/
    expect(tempRef).toMatch(regex)
  })

  test('should not generate the same ID twice in 20,000 IDs', () => {
    const ids = []
    const numberToCreate = 20000

    for (let index = 0; index < numberToCreate; index++) {
      ids.push(createTempReference({ referenceForClaim: true }))
    }

    expect(ids.length).toEqual(numberToCreate)

    const set = new Set(ids)

    expect(set.size).toEqual(numberToCreate)
  })
})


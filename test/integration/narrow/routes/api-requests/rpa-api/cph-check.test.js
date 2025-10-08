import { customerHasAtLeastOneValidCph } from "../../../../../../app/api-requests/rpa-api/cph-check";

test("customerHasAtLeastOneValidCph returns false if the users cph is not valid", async () => {
  expect(customerHasAtLeastOneValidCph(["33/333/8888"])).toBeFalsy();
});

test("customerHasAtLeastOneValidCph returns true if the users cph is valid", async () => {
  expect(customerHasAtLeastOneValidCph(["33/333/3333"])).toBeTruthy();
});

test("customerHasAtLeastOneValidCph returns true if the user has an invalid and a valid cph", async () => {
  expect(customerHasAtLeastOneValidCph(["33/333/8888", "33/333/3333"])).toBeTruthy();
});

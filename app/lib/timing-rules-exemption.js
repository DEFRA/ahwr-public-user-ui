import { config } from "../config/index.js";
import { toDateOnly } from "./utils.js";

// Whether a vet visit date falls in the 10-month exemption window (START_10_MONTH_EXEMPTION to
// END_10_MONTH_EXEMPTION, both inclusive). No start: no exemption. No end: no end to the exemption.
// The window dates are read as local midnight, like the release dates in claim-constants.js.
export const isWithinTenMonthExemption = (dateOfVisit) => {
  const start = config.get("tenMonthExemption.start");
  const end = config.get("tenMonthExemption.end");
  const visit = toDateOnly(dateOfVisit);

  return (
    Boolean(start) &&
    visit >= new Date(`${start}T00:00:00`) &&
    (!end || visit <= new Date(`${end}T00:00:00`))
  );
};

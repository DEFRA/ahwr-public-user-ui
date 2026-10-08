import { config } from "../config/index.js";
import { toDateOnly } from "./utils.js";

// Whether a vet visit date falls in the 10-month exemption window (START_10_MONTH_EXEMPTION to
// END_10_MONTH_EXEMPTION, both inclusive). No start: no exemption. No end: no end to the exemption.
export const isWithinTenMonthExemption = (dateOfVisit) => {
  const { start, end } = config.get("tenMonthExemption");
  const visit = toDateOnly(dateOfVisit);
  return Boolean(start) && visit >= start && (!end || visit <= end);
};

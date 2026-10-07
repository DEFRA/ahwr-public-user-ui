import { config } from "../config/index.js";

// when on, the livestock 10-month gaps (review to review, follow-up to follow-up) are
// suspended. Simple toggle: switch it on on the policy effective date.
export const isTimingRulesExemptionEnabled = () =>
  config.get("livestockTimingRulesExemption.enabled");

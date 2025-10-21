import { claimConstants } from "../constants/claim-constants.js";
import { getClaimType } from "./utils.js";

export function getSpeciesEligibleNumberForDisplay(claimData, isEndemicsClaims = false) {
  return {
    beef: isEndemicsClaims ? "11 or more beef cattle " : "11 or more cattle ",
    dairy: isEndemicsClaims ? "11 or more dairy cattle " : "11 or more cattle ",
    pigs: "51 or more pigs ",
    sheep: "21 or more sheep ",
  }[getClaimType(claimData, isEndemicsClaims)];
}

export function getVaccinationStatusForDisplay(vaccinatedNotVaccinated) {
  if (vaccinatedNotVaccinated === claimConstants.vaccination.vaccinated) {
    return "Vaccinated";
  }
  if (vaccinatedNotVaccinated === claimConstants.vaccination.notVaccinated) {
    return "Not vaccinated";
  }
  return undefined;
}

export function upperFirstLetter(str) {
  if (!str) {
    return undefined;
  }
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });

export const getHerdOrFlock = (typeOfLivestock) => (typeOfLivestock === "sheep" ? "flock" : "herd");

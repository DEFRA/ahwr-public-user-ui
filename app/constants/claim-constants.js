import { config } from "../config/index.js";
import { claimType, TYPE_OF_LIVESTOCK } from "ffc-ahwr-common-library";

export const claimConstants = {
  thresholdPerClaimType: {
    beef: 5,
    pigs: 30,
    sheep: 10,
  },
  diseaseStatusTypes: {
    1: "1",
    2: "2",
    3: "3",
    4: "4",
  },
  vaccination: {
    vaccinated: "vaccinated",
    notVaccinated: "notVaccinated",
  },
  result: {
    positive: "positive",
    negative: "negative",
  },
  pigsFollowUpTest: {
    pcr: "pcr",
    elisa: "elisa",
  }
};

const { review, endemics } = claimType;

export const { BEEF, DAIRY, PIGS, SHEEP } = TYPE_OF_LIVESTOCK;

export const thresholds = {
  minimumNumberFluidOralSamples: 5,
  positiveReviewNumberOfSamplesTested: "6",
  negativeReviewNumberOfSamplesTested: "30",
  numberOfSpeciesTested: {
    [BEEF]: {
      [review]: 5,
      [endemics]: 11,
    },
    [DAIRY]: {
      [review]: 5,
      [endemics]: 1,
    },
    [PIGS]: {
      [review]: 30,
      [endemics]: 30,
    },
    [SHEEP]: {
      [review]: 10,
      [endemics]: 1,
    },
  },
};

export const ONLY_HERD = "onlyHerd";

export const ONLY_HERD_ON_SBI = {
  YES: "yes",
  NO: "no",
};

export const MULTIPLE_SPECIES_RELEASE_DATE = new Date("2025-02-26T00:00:00");
export const MULTIPLE_HERDS_RELEASE_DATE = new Date(config.multiHerds.releaseDate);
export const PI_HUNT_AND_DAIRY_FOLLOW_UP_RELEASE_DATE = new Date("2025-01-21T00:00:00");

export const LAST_HOUR_OF_DAY = 23;
export const LAST_MINUTE_OF_HOUR = 59;
export const LAST_SECOND_OF_MINUTE = 59;
export const LAST_MILLISECOND_OF_SECOND = 999;

export const MAX_POSSIBLE_YEAR = 9999;
export const MIN_POSSIBLE_YEAR = 1000;
export const MAX_POSSIBLE_DAY = 31;
export const MAX_POSSIBLE_DAY_SHORT_MONTHS = 30;
export const MAX_POSSIBLE_DAY_FEB_LEAP_YEAR = 29;
export const MAX_POSSIBLE_DAY_FEB = 28;
export const MAX_POSSIBLE_MONTH = 12;
const APRIL_INDEX = 4;
const JUNE_INDEX = 6;
const SEPTEMBER_INDEX = 9;
const NOVEMBER_INDEX = 11;
export const SHORT_MONTHS = [APRIL_INDEX, JUNE_INDEX, SEPTEMBER_INDEX, NOVEMBER_INDEX];

const TRACE_ELEMENTS = "Trace elements";
const LIVER_FLUKE = "Liver fluke";
const EWE_NUTRITION_STATUS = "Ewe nutrition status";
const TICK_BORNE_FEVER = "Tick-borne fever";
const BORDER_DISEASE = "Border disease (BD)";
const TICK_PYAEMIA = "Tick pyaemia";

export const sheepPackages = {
  improvedEwePerformance: "Ewe condition",
  improvedReproductivePerformance: "Reproductive performance",
  improvedLambPerformance: "Lamb performance",
  improvedNeonatalLambSurvival: "Neonatal lamb survival",
  reducedExternalParasites: "External parasites",
  reducedLameness: "Lameness",
};

export const sheepTestTypes = {
  improvedEwePerformance: [
    { value: "johnes", text: "Johne’s" },
    { value: "mv", text: "Maedi Visna (MV)" },
    { value: "cla", text: "Caseous Lymphadenitis (CLA)" },
    { value: "opa", text: "Ovine Pulmonary Adenocarcinoma (OPA)" },
    { value: "traceElements", text: TRACE_ELEMENTS },
    { value: "liverFluke", text: LIVER_FLUKE },
    { value: "haemonchosis", text: "Haemonchosis" },
    { value: "eweNutritionStatus", text: EWE_NUTRITION_STATUS },
    { value: "mastitis", text: "Mastitis" },
    { value: "tickBorneFever", text: TICK_BORNE_FEVER },
    { value: "loupingIll", text: "Louping ill" },
    { value: "orf", text: "Orf" },
    { value: "pulpyKidney", text: "Pulpy kidney" },
    { value: "other", text: "Other" },
  ],
  improvedReproductivePerformance: [
    { value: "eae", text: "Enzootic abortion of ewes (EAE)" },
    { value: "bd", text: BORDER_DISEASE },
    { value: "toxoplasmosis", text: "Toxoplasmosis" },
    { value: "eweNutritionStatus", text: EWE_NUTRITION_STATUS },
    { value: "traceElements", text: TRACE_ELEMENTS },
    { value: "liverFluke", text: LIVER_FLUKE },
    { value: "tickBorneFever", text: TICK_BORNE_FEVER },
    { value: "other", text: "Other" },
  ],
  improvedLambPerformance: [
    { value: "bd", text: BORDER_DISEASE },
    { value: "traceElements", text: TRACE_ELEMENTS },
    { value: "liverFluke", text: LIVER_FLUKE },
    { value: "pge", text: "Parasitic gastroenteritis (PGE)" },
    { value: "coccidiosis", text: "Coccidiosis" },
    { value: "mastitis", text: "Mastitis" },
    { value: "tickBorneFever", text: TICK_BORNE_FEVER },
    { value: "loupingIll", text: "Louping ill" },
    { value: "tickPyaemia", text: TICK_PYAEMIA },
    { value: "lambNutritionStatus", text: "Lamb nutrition status" },
    { value: "orf", text: "Orf" },
    { value: "pulpyKidney", text: "Pulpy kidney" },
    { value: "lambDysentery", text: "Lamb dysentery" },
    { value: "pasteurellosis", text: "Pasteurellosis" },
    { value: "other", text: "Other" },
  ],
  improvedNeonatalLambSurvival: [
    { value: "bd", text: BORDER_DISEASE },
    { value: "toxoplasmosis", text: "Toxoplasmosis" },
    { value: "jointIll", text: "Joint ill" },
    { value: "eweNutritionStatus", text: EWE_NUTRITION_STATUS },
    { value: "traceElements", text: TRACE_ELEMENTS },
    { value: "wateryMouth", text: "Watery mouth" },
    { value: "mastitis", text: "Mastitis" },
    { value: "tickPyaemia", text: TICK_PYAEMIA },
    { value: "lambDysentery", text: "Lamb dysentery" },
    { value: "pasteurellosis", text: "Pasteurellosis" },
    { value: "other", text: "Other" },
  ],
  reducedExternalParasites: [
    { value: "flystrike", text: "Flystrike" },
    { value: "sheepScab", text: "Sheep scab" },
    { value: "other", text: "Other" },
  ],
  reducedLameness: [
    { value: "jointIll", text: "Joint ill" },
    { value: "tickBorneFever", text: TICK_BORNE_FEVER },
    { value: "footRot", text: "Foot rot" },
    { value: "scald", text: "Scald" },
    { value: "codd", text: "CODD" },
    { value: "granuloma", text: "Granuloma" },
    { value: "heelOrToeAbscess", text: "Heel or toe abscess" },
    { value: "shellyHoof", text: "Shelly hoof" },
    { value: "tickPyaemia", text: TICK_PYAEMIA },
    { value: "other", text: "Other" },
  ],
};

export const testResultOptions = {
  clinicalSymptoms: [
    { value: "clinicalSymptomsPresent", text: "Clinical symptoms present" },
    { value: "clinicalSymptomsNotPresent", text: "Clinical symptoms not present" },
  ],
  positiveNegative: [
    { value: "positive", text: "Positive" },
    { value: "negative", text: "Negative" },
  ],
  problem: [
    { value: "problemIdentified", text: "Problem identified" },
    { value: "noProblemIdentified", text: "No problem identified" },
  ],
};

export const { positiveNegative, clinicalSymptoms, problem } = testResultOptions;

export const sheepTestResultsType = {
  bd: positiveNegative,
  cla: positiveNegative,
  coccidiosis: clinicalSymptoms,
  codd: clinicalSymptoms,
  eae: positiveNegative,
  eweNutritionStatus: problem,
  flystrike: clinicalSymptoms,
  footRot: clinicalSymptoms,
  granuloma: clinicalSymptoms,
  haemonchosis: clinicalSymptoms,
  heelOrToeAbscess: clinicalSymptoms,
  johnes: positiveNegative,
  jointIll: clinicalSymptoms,
  lambDysentery: positiveNegative,
  lambNutritionStatus: problem,
  lameness: clinicalSymptoms,
  liverFluke: clinicalSymptoms,
  loupingIll: clinicalSymptoms,
  mastitis: clinicalSymptoms,
  mv: positiveNegative,
  opa: clinicalSymptoms,
  orf: clinicalSymptoms,
  pasteurellosis: clinicalSymptoms,
  pge: clinicalSymptoms,
  pulpyKidney: positiveNegative,
  scald: clinicalSymptoms,
  sheepScab: positiveNegative,
  shellyHoof: clinicalSymptoms,
  tickBorneFever: positiveNegative,
  tickPyaemia: clinicalSymptoms,
  toxoplasmosis: positiveNegative,
  traceElements: problem,
  wateryMouth: clinicalSymptoms,
};

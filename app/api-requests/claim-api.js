// import Wreck from "@hapi/wreck";
// import { config } from "../config/index.js";

export async function getClaimsByApplicationReference(_applicationReference, _logger) {
  // TODO - make this return real claims

  return [{
    id: "58b297c9-c983-475c-8bdb-db5746899cec",
    reference: "AHWR-1111-6666",
    applicationReference: "AHWR-1234-APP1",
    data: {
      claimType: "R",
      typeOfLivestock: "pigs",
      vetsName: "Vet one",
      dateOfVisit: "2024-03-22T00:00:00.000Z",
      dateOfTesting: "2024-03-22T00:00:00.000Z",
      vetRCVSNumber: "1233211",
      laboratoryURN: "123456",
      speciesNumbers: "yes",
      numberOfOralFluidSamples: "6",
      numberAnimalsTested: "40",
      testResults: "positive",
    },
    statusId: 8,
    type: "R",
    createdAt: "2024-03-25T12:20:18.307Z",
    updatedAt: "2024-03-25T12:20:18.307Z",
    createdBy: "sql query",
    updatedBy: null,
    status: "PAID",
    flags: [],
  }];
  // const endpoint = `${config.applicationApiUri}/claim/get-by-application-reference/${applicationReference}`;
  // try {
  //   const { payload } = await Wreck.get(endpoint, { json: true });

  //   return payload;
  // } catch (err) {
  //   logger.setBindings({ err });
  //   throw err;
  // }
}

export function isWithinLastTenMonths(date) {
  if (!date) {
    return false; // Date of visit was introduced more than 10 months ago
  }

  const start = new Date(date);
  const end = new Date(start);

  end.setMonth(end.getMonth() + 10);
  end.setHours(23, 59, 59, 999); // set to midnight of the agreement end day

  return Date.now() <= end;
}

// import Wreck from "@hapi/wreck";
// import { config } from "../config/index.js";

export async function getLatestApplicationsBySbi(_sbi, _logger) {
  // TODO - make this return real data
  return [{
    id: "787b407f-29da-4d75-889f-1c614d47e87e",
    reference: "AHWR-1234-APP1",
    data: {
      type: "EE",
      reference: null,
      declaration: true,
      offerStatus: "accepted",
      organisation: {
        sbi: "113494460",
        name: "Test Farm Lodge",
        email: "russelldaviese@seivadllessurm.com.test",
        orgEmail: "orgEmail@gmail.com",
        address:
          "Tesco Stores Ltd,Harwell,Betton,WHITE HOUSE FARM,VINCENT CLOSE,LEIGHTON BUZZARD,HR2 8AN,United Kingdom",
        userType: "newUser",
        farmerName: "Russell Paul Davies",
      },
      confirmCheckDetails: "yes",
    },
    claimed: false,
    createdAt: "2024-03-22T12:19:04.696Z",
    updatedAt: "2024-03-22T12:19:04.696Z",
    createdBy: "sql query",
    updatedBy: null,
    statusId: 1,
    type: "EE",
    status: "AGREED",
    flags: [],
    applicationRedacts: [],
  }];
  // const endpoint = `${config.applicationApi.uri}/applications/latest?sbi=${sbi}`;
  // try {
  //   const { payload } = await Wreck.get(endpoint, { json: true });

  //   return payload;
  // } catch (err) {
  //   logger.setBindings({ err });
  //   throw err;
  // }
}

export const resetFarmerApplyDataBeforeApplication = (application) => {
  delete application.agreeSpeciesNumbers;
  delete application.agreeSameSpecies;
  delete application.agreeMultipleSpecies;
  delete application.agreeVisitTimings;
};

export const formatOrganisation = (organisation) => ({
  ...organisation,
  address: organisation.address.split(",").map((line) => line.trim()),
});

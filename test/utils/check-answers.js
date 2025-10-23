export const getRowKeys = ($) => {
  return $('.govuk-summary-list__key').map((index, element) => $(element).text().trim()).get()
}
export const getRowContents = ($) => {
  return $('.govuk-summary-list__value').map((index, element) => $(element).text().trim()).get()
}
export const getRowActionTexts = ($) => {
  return $('.govuk-summary-list__actions').map((index, element) => $(element).text().trim()).get()
}
export const getRowLinks = ($) => {
  return $('.govuk-summary-list__actions .govuk-link').map((index, element) => $(element).attr('href')).get()
}

export const commonVetRowKeys = [
  "Vet's name",
  "Vet's RCVS number"
]

export const commonVetRowActionTexts = [
  "Change vet's name",
  "Change vet's rcvs number"
]

export const commonReviewRowKeys = [
  'Business name',
  'Livestock',
  'Review or follow-up',
  'Date of review',
  'Date of sampling'
]

export const commonEndemicsFollowUpRowKeys = [
  'Business name',
  'Livestock',
  'Review or follow-up',
  'Date of follow-up'
]

// Review claim data
export const baseReviewClaim = {
  organisation: { name: 'business name' },
  typeOfReview: 'REVIEW',
  dateOfVisit: '2023-12-19T10:25:11.318Z',
  dateOfTesting: '2023-12-19T10:25:11.318Z',
  speciesNumbers: 'Yes',
  vetsName: 'George',
  vetRCVSNumber: '1234567',
  laboratoryURN: 'laboratoryURN',
  reference: 'TEMP-6GSE-PIR8'
}

export const beefReviewClaim = { ...baseReviewClaim, typeOfLivestock: 'beef', numberAnimalsTested: '42', testResults: 'positive', latestEndemicsApplication: { flags: [] } }
export const dairyReviewClaim = { ...baseReviewClaim, typeOfLivestock: 'dairy', testResults: 'positive', latestEndemicsApplication: { flags: [] } }
export const pigsReviewClaim = { ...baseReviewClaim, typeOfLivestock: 'pigs', numberAnimalsTested: '42', numberOfOralFluidSamples: '10', testResults: 'positive', latestEndemicsApplication: { flags: [] } }
export const sheepReviewClaim = { ...baseReviewClaim, typeOfLivestock: 'sheep', numberAnimalsTested: '42', latestEndemicsApplication: { flags: [] } }

export const expectedReviewBeef = {
  rowKeys: [
    ...commonReviewRowKeys,
    '11 or more beef cattle',
    'Number of samples taken',
    ...commonVetRowKeys,
    'URN or test certificate',
    'Test results'
  ],
  rowContents: [
    'Business name',
    'Beef cattle',
    'Animal health and welfare review',
    '19 December 2023',
    '19 December 2023',
    'Yes',
    '42',
    'George',
    '1234567',
    'laboratoryURN',
    'Positive'
  ],
  rowActionTexts: [
    'Change date of review',
    'Change date of sampling',
    'Change number of species',
    'Change number of samples taken',
    ...commonVetRowActionTexts,
    'Change URN',
    'Change test results'
  ],
  rowLinks: [
    '/date-of-visit',
    '/date-of-testing',
    '/species-numbers',
    '/number-of-species-tested',
    '/vet-name',
    '/vet-rcvs',
    '/test-urn',
    '/test-results'
  ]
}

export const expectedReviewDairy = {
  rowKeys: [
    ...commonReviewRowKeys,
    '11 or more dairy cattle',
    ...commonVetRowKeys,
    'URN or test certificate',
    'Test results'
  ],
  rowContents: [
    'Business name',
    'Dairy cattle',
    'Animal health and welfare review',
    '19 December 2023',
    '19 December 2023',
    'Yes',
    'George',
    '1234567',
    'laboratoryURN',
    'Positive'
  ],
  rowActionTexts: [
    'Change date of review',
    'Change date of sampling',
    'Change number of species',
    ...commonVetRowActionTexts,
    'Change URN',
    'Change test results'
  ],
  rowLinks: [
    '/date-of-visit',
    '/date-of-testing',
    '/species-numbers',
    '/vet-name',
    '/vet-rcvs',
    '/test-urn',
    '/test-results'
  ]
}

export const expectedReviewPigs = {
  rowKeys: [
    ...commonReviewRowKeys,
    '51 or more pigs',
    'Number of samples taken',
    ...commonVetRowKeys,
    'URN',
    'Number of oral fluid samples taken',
    'Test results'
  ],
  rowContents: [
    'Business name',
    'Pigs',
    'Animal health and welfare review',
    '19 December 2023',
    '19 December 2023',
    'Yes',
    '42',
    'George',
    '1234567',
    'laboratoryURN',
    '10',
    'Positive'
  ],
  rowActionTexts: [
    'Change date of review',
    'Change date of sampling',
    'Change number of species',
    'Change number of samples taken',
    ...commonVetRowActionTexts,
    'Change URN',
    'Change number of oral fluid samples taken',
    'Change test results'
  ],
  rowLinks: [
    '/date-of-visit',
    '/date-of-testing',
    '/species-numbers',
    '/number-of-species-tested',
    '/vet-name',
    '/vet-rcvs',
    '/test-urn',
    '/number-of-fluid-oral-samples',
    '/test-results'
  ]
}

export const expectedReviewSheep = {
  rowKeys: [
    ...commonReviewRowKeys,
    '21 or more sheep',
    'Number of samples taken',
    ...commonVetRowKeys,
    'URN'
  ],
  rowContents: [
    'Business name',
    'Sheep',
    'Animal health and welfare review',
    '19 December 2023',
    '19 December 2023',
    'Yes',
    '42',
    'George',
    '1234567',
    'laboratoryURN'
  ],
  rowActionTexts: [
    'Change date of review',
    'Change date of sampling',
    'Change number of species',
    'Change number of samples taken',
    ...commonVetRowActionTexts,
    'Change URN'
  ],
  rowLinks: [
    '/date-of-visit',
    '/date-of-testing',
    '/species-numbers',
    '/number-of-species-tested',
    '/vet-name',
    '/vet-rcvs',
    '/test-urn'
  ]
}

// Endemic follow-up claim data
export const baseEndemicsFollowUpClaim = {
  organisation: { name: 'business name' },
  typeOfReview: 'FOLLOW_UP',
  dateOfVisit: '2023-12-19T10:25:11.318Z',
  dateOfTesting: '2023-12-19T10:25:11.318Z',
  speciesNumbers: 'Yes',
  vetsName: 'George',
  vetRCVSNumber: '1234567',
  laboratoryURN: 'laboratoryURN',
  reference: 'TEMP-6GSE-PIR8'
}

export const sheepEndemicsPackage = 'reducedExternalParasites'
export const sheepTests = ['flystrike', 'sheepScab', 'other']
export const sheepTestResults = [
  { diseaseType: 'flystrike', result: 'clinicalSymptomsPresent' },
  { diseaseType: 'sheepScab', result: 'negative' },
  {
    diseaseType: 'other',
    result: [
      { diseaseType: 'disease one', testResult: 'test result one' },
      { diseaseType: 'disease two', testResult: 'test result two' }
    ]
  }
]

export const beefEndemicsFollowUpClaim = { ...baseEndemicsFollowUpClaim, typeOfLivestock: 'beef', numberAnimalsTested: '42', testResults: 'positive', biosecurity: 'yes', latestEndemicsApplication: { flags: [] } }
export const dairyEndemicsFollowUpClaim = { ...baseEndemicsFollowUpClaim, typeOfLivestock: 'dairy', testResults: 'positive', biosecurity: 'yes', latestEndemicsApplication: { flags: [] } }
export const pigEndemicsFollowUpClaim = { ...baseEndemicsFollowUpClaim, typeOfLivestock: 'pigs', numberAnimalsTested: '42', numberOfSamplesTested: '5', pigsElisaTestResult: 'positive', herdVaccinationStatus: 'vaccinated', biosecurity: { biosecurity: 'yes', assessmentPercentage: '50' }, latestEndemicsApplication: { flags: [] } }
export const sheepEndemicsFollowUpClaim = { ...baseEndemicsFollowUpClaim, typeOfLivestock: 'sheep', numberAnimalsTested: '42', sheepEndemicsPackage, sheepTests, sheepTestResults, latestEndemicsApplication: { flags: [] } }
export const dairyEndemicsFollowUpClaimPiHuntDeclined = { ...dairyEndemicsFollowUpClaim, dateOfTesting: undefined, piHunt: 'no' }

export const expectedEndemicsFollowUpBeef = {
  rowKeys: [
    ...commonEndemicsFollowUpRowKeys,
    '11 or more beef cattle',
    'Number of samples taken',
    ...commonVetRowKeys,
    'Date of sampling',
    'URN or test certificate',
    'Follow-up test result',
    'Biosecurity assessment'
  ],
  rowContents: [
    'Business name',
    'Beef cattle',
    'Endemic disease follow-up',
    '19 December 2023',
    'Yes',
    '42',
    'George',
    '1234567',
    '19 December 2023',
    'laboratoryURN',
    'Positive',
    'Yes'
  ],
  rowActionTexts: [
    'Change date of follow-up',
    'Change number of species',
    'Change number of samples taken',
    ...commonVetRowActionTexts,
    'Change date of sampling',
    'Change URN',
    'Change test results',
    'Change biosecurity assessment'
  ],
  rowLinks: [
    '/date-of-visit',
    '/species-numbers',
    '/number-of-species-tested',
    '/vet-name',
    '/vet-rcvs',
    '/date-of-testing',
    '/test-urn',
    '/test-results',
    '/biosecurity'
  ]
}

export const expectedEndemicsFollowUpDairy = {
  rowKeys: [
    ...commonEndemicsFollowUpRowKeys,
    '11 or more dairy cattle',
    ...commonVetRowKeys,
    'Date of sampling',
    'URN or test certificate',
    'Follow-up test result',
    'Biosecurity assessment'
  ],
  rowContents: [
    'Business name',
    'Dairy cattle',
    'Endemic disease follow-up',
    '19 December 2023',
    'Yes',
    'George',
    '1234567',
    '19 December 2023',
    'laboratoryURN',
    'Positive',
    'Yes'
  ],
  rowActionTexts: [
    'Change date of follow-up',
    'Change number of species',
    ...commonVetRowActionTexts,
    'Change date of sampling',
    'Change URN',
    'Change test results',
    'Change biosecurity assessment'
  ],
  rowLinks: [
    '/date-of-visit',
    '/species-numbers',
    '/vet-name',
    '/vet-rcvs',
    '/date-of-testing',
    '/test-urn',
    '/test-results',
    '/biosecurity'
  ]
}

export const expectedEndemicsFollowUpDairyPiHuntDeclined = {
  rowKeys: [
    ...commonEndemicsFollowUpRowKeys,
    '11 or more dairy cattle',
    ...commonVetRowKeys,
    'PI hunt',
    'URN or test certificate',
    'Follow-up test result',
    'Biosecurity assessment'
  ],
  rowContents: [
    'Business name',
    'Dairy cattle',
    'Endemic disease follow-up',
    '19 December 2023',
    'Yes',
    'George',
    '1234567',
    'No',
    'laboratoryURN',
    'Positive',
    'Yes'
  ],
  rowActionTexts: [
    'Change date of follow-up',
    'Change number of species',
    ...commonVetRowActionTexts,
    'Change the pi hunt',
    'Change URN',
    'Change test results',
    'Change biosecurity assessment'
  ],
  rowLinks: [
    '/date-of-visit',
    '/species-numbers',
    '/vet-name',
    '/vet-rcvs',
    '/pi-hunt',
    '/test-urn',
    '/test-results',
    '/biosecurity'
  ]
}

export const expectedEndemicsFollowUpPigs = () => ({
  rowKeys: [
    ...commonEndemicsFollowUpRowKeys,
    'Date of sampling',
    '51 or more pigs',
    'Number of samples taken',
    ...commonVetRowKeys,
    'Herd PRRS vaccination status',
    'URN',
    'Number of samples tested',
    'Test result',
    'Biosecurity assessment'
  ],
  rowContents: [
    'Business name',
    'Pigs',
    'Endemic disease follow-up',
    '19 December 2023',
    '19 December 2023',
    'Yes',
    '42',
    'George',
    '1234567',
    'Vaccinated',
    'laboratoryURN',
    '5',
    'ELISA positive',
    'Yes, Assessment percentage: 50%'
  ],
  rowActionTexts: [
    'Change date of follow-up',
    'Change date of sampling',
    'Change number of species',
    'Change number of samples taken',
    ...commonVetRowActionTexts,
    'Change herd PRRS vaccination status',
    'Change URN',
    'Change number of samples tested',
    'Change test result',
    'Change biosecurity assessment'
  ],
  rowLinks: [
    '/date-of-visit',
    '/date-of-testing',
    '/species-numbers',
    '/number-of-species-tested',
    '/vet-name',
    '/vet-rcvs',
    '/vaccination',
    '/test-urn',
    '/number-of-samples-tested',
    '/pigs-elisa-result',
    '/biosecurity'
  ]
})

export const expectedEndemicsFollowUpSheep = {
  rowKeys: [
    ...commonEndemicsFollowUpRowKeys,
    'Date of sampling',
    '21 or more sheep',
    'Number of samples taken',
    ...commonVetRowKeys,
    'URN',
    'Sheep health package',
    'Diseases or conditions tested for',
    'Disease or condition test result',
    '',
    ''
  ],
  rowContents: [
    'Business name',
    'Sheep',
    'Endemic disease follow-up',
    '19 December 2023',
    '19 December 2023',
    'Yes',
    '42',
    'George',
    '1234567',
    'laboratoryURN',
    'External parasites',
    'Flystrike Sheep scab Other',
    'Flystrike (Clinical symptoms present)',
    'Sheep scab (Negative)',
    'disease one (test result one) disease two (test result two)'
  ],
  rowActionTexts: [
    'Change date of follow-up',
    'Change date of sampling',
    'Change number of species',
    'Change number of samples taken',
    ...commonVetRowActionTexts,
    'Change URN',
    'Change sheep health package',
    'Change diseases or conditions tested for',
    'Change disease type flystrike and test result',
    'Change disease type sheepScab and test result',
    'Change disease type other and test result'
  ],
  rowLinks: [
    '/date-of-visit',
    '/date-of-testing',
    '/species-numbers',
    '/number-of-species-tested',
    '/vet-name',
    '/vet-rcvs',
    '/test-urn',
    '/sheep-endemics-package',
    '/sheep-tests',
    '/sheep-test-results?diseaseType=flystrike',
    '/sheep-test-results?diseaseType=sheepScab',
    '/sheep-test-results?diseaseType=other'
  ]
}

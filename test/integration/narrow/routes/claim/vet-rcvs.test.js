import * as cheerio from 'cheerio'
import { createServer } from '../../../../../app/server.js'
import expectPhaseBanner from 'assert'
import { getCrumbs } from '../../../../utils/get-crumbs.js'
import { isVisitDateAfterPIHuntAndDairyGoLive } from '../../../../../app/lib/context-helper.js'
import { getSessionData, setSessionData } from "../../../../../app/session/index.js";

jest.mock('../../../../../app/session/index.js')
jest.mock('../../../../../app/lib/context-helper.js')

const errorMessages = {
  enterRCVS: 'Enter an RCVS number',
  validRCVS: 'An RCVS number is a 7 digit number or a 6 digit number ending in a letter.'
}

describe('Vet rcvs test when Optional PI Hunt is OFF', () => {
  const auth = { credentials: {}, strategy: 'cookie' }
  const url = '/vet-rcvs'
  let server

  beforeAll(async () => {
    getSessionData.mockImplementation(() => { return { typeOfLivestock: 'pigs', reference: 'TEMP-6GSE-PIR8' } })
    setSessionData.mockImplementation(() => { })
    server = await createServer()
    await server.initialize()
    isVisitDateAfterPIHuntAndDairyGoLive.mockImplementation(() => { return false })
  })

  afterAll(async () => {
    jest.resetAllMocks()
    await server.stop()
  })

  describe(`GET ${url} route`, () => {
    test('returns 200', async () => {
      const options = {
        method: 'GET',
        url,
        auth
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(200)
      const $ = cheerio.load(res.payload)
      expect($('h1 > label').text().trim()).toMatch('What is the vet\'s Royal College of Veterinary Surgeons (RCVS) number?')
      expect($('title').text().trim()).toContain('What is the vet\'s Royal College of Veterinary Surgeons (RCVS) number? - Get funding to improve animal health and welfare')
      expectPhaseBanner.ok($)
    })

    test('when not logged in redirects to /sign-in', async () => {
      const options = {
        method: 'GET',
        url
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(302)
      expect(res.headers.location.toString()).toEqual(`/sign-in`)
    })
  })

  describe(`POST ${url} route`, () => {
    let crumb

    beforeEach(async () => {
      crumb = await getCrumbs(server)
    })

    test('when not logged in redirects to /sign-in', async () => {
      const options = {
        method: 'POST',
        url,
        payload: { crumb, vetRCVSNumber: '123' },
        headers: { cookie: `crumb=${crumb}` }
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(302)
      expect(res.headers.location.toString()).toEqual(`/sign-in`)
    })

    test.each([
      { vetRCVSNumber: undefined, errorMessage: errorMessages.enterRCVS, expectedVal: undefined },
      { vetRCVSNumber: null, errorMessage: errorMessages.enterRCVS, expectedVal: undefined },
      { vetRCVSNumber: '', errorMessage: errorMessages.enterRCVS, expectedVal: '' },
      { vetRCVSNumber: 'not-valid-ref', errorMessage: errorMessages.validRCVS, expectedVal: 'not-valid-ref' },
      { vetRCVSNumber: '123456A', errorMessage: errorMessages.validRCVS, expectedVal: '123456A' },
      { vetRCVSNumber: '12345678', errorMessage: errorMessages.validRCVS, expectedVal: '12345678' }
    ])('returns 400 when payload is invalid - %p', async ({ vetRCVSNumber, errorMessage, expectedVal }) => {
      const options = {
        method: 'POST',
        url,
        auth,
        payload: { crumb, vetRCVSNumber },
        headers: { cookie: `crumb=${crumb}` }
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(400)
      const $ = cheerio.load(res.payload)
      expect($('h1 > label').text().trim()).toMatch('What is the vet\'s Royal College of Veterinary Surgeons (RCVS) number?')
      expect($('#main-content > div > div > div > div > div > ul > li > a').text()).toMatch(errorMessage)
      expect($('#vetRCVSNumber').val()).toEqual(expectedVal)
    })

    test.each([
      { vetRCVSNumber: '1234567', reviewTestResults: 'positive', nextPageURL: '/pi-hunt' },
      { vetRCVSNumber: '123456X', reviewTestResults: 'negative', nextPageURL: '/biosecurity' },
      { vetRCVSNumber: '123456X', reviewTestResults: undefined, nextPageURL: '/test-urn' }
    ])('returns 200 when payload is valid and stores in session (vetRCVSNumber= $vetRCVSNumber)', async ({ vetRCVSNumber, reviewTestResults, nextPageURL }) => {
      getSessionData.mockImplementation(() => { return { reviewTestResults, typeOfLivestock: 'beef' } })

      const options = {
        method: 'POST',
        url,
        auth,
        payload: { crumb, vetRCVSNumber },
        headers: { cookie: `crumb=${crumb}` }
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(302)
      expect(res.headers.location).toEqual(nextPageURL)
      expect(setSessionData).toHaveBeenCalled()
    })
    test.each([
      { typeOfLivestock: 'beef', typeOfReview: 'FOLLOW_UP', relevantReviewForEndemics: { type: 'VV' }, nextPageURL: '/test-urn' },
      { typeOfLivestock: 'sheep', typeOfReview: 'FOLLOW_UP', relevantReviewForEndemics: { type: 'VV' }, nextPageURL: '/sheep-endemics-package' },
      { typeOfLivestock: 'pigs', typeOfReview: 'FOLLOW_UP', relevantReviewForEndemics: { type: 'VV' }, nextPageURL: '/vet-visits-review-test-results' },
      { typeOfLivestock: 'beef', typeOfReview: 'FOLLOW_UP', relevantReviewForEndemics: { type: undefined }, nextPageURL: '/test-urn' },
      { typeOfLivestock: 'dairy', typeOfReview: 'FOLLOW_UP', relevantReviewForEndemics: { type: undefined }, nextPageURL: '/test-urn' },
      { typeOfLivestock: 'sheep', typeOfReview: 'FOLLOW_UP', relevantReviewForEndemics: { type: undefined }, nextPageURL: '/sheep-endemics-package' },
      { typeOfLivestock: 'pigs', typeOfReview: 'FOLLOW_UP', relevantReviewForEndemics: { type: undefined }, nextPageURL: '/vaccination' },
      { typeOfLivestock: 'beef', typeOfReview: 'REVIEW', relevantReviewForEndemics: undefined, nextPageURL: '/test-urn' },
      { typeOfLivestock: 'dairy', typeOfReview: 'REVIEW', relevantReviewForEndemics: undefined, nextPageURL: '/test-urn' },
      { typeOfLivestock: 'sheep', typeOfReview: 'REVIEW', relevantReviewForEndemics: undefined, nextPageURL: '/test-urn' },
      { typeOfLivestock: 'pigs', typeOfReview: 'REVIEW', relevantReviewForEndemics: undefined, nextPageURL: '/test-urn' }
    ])('Redirect $nextPageURL When species $typeOfLivestock and type of review is $typeOfReview and application from old world is $relevantReviewForEndemics ', async ({ typeOfLivestock, typeOfReview, relevantReviewForEndemics, nextPageURL }) => {
      getSessionData.mockImplementation(() => { return { typeOfLivestock, typeOfReview, relevantReviewForEndemics } })
      const options = {
        method: 'POST',
        url,
        auth,
        payload: { crumb, vetRCVSNumber: '1234567' },
        headers: { cookie: `crumb=${crumb}` }
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(302)
      expect(res.headers.location).toEqual(nextPageURL)
      expect(setSessionData).toHaveBeenCalled()
    })
  })
})

describe('Vet rcvs test when Optional PI Hunt is ON', () => {
  const auth = { credentials: {}, strategy: 'cookie' }
  const url = '/vet-rcvs'
  let server

  beforeAll(async () => {
    getSessionData.mockImplementation(() => { return { typeOfLivestock: 'pigs' } })
    setSessionData.mockImplementation(() => { })
    server = await createServer()
    await server.initialize()
    isVisitDateAfterPIHuntAndDairyGoLive.mockImplementation(() => { return true })
  })

  afterAll(async () => {
    jest.resetAllMocks()
    await server.stop()
  })

  describe(`POST ${url} route`, () => {
    let crumb

    beforeEach(async () => {
      crumb = await getCrumbs(server)
    })
    test.each([
      { typeOfLivestock: 'beef' },
      { typeOfLivestock: 'dairy' }
    ])('Redirect $nextPageURL When species $typeOfLivestock and type of review is $typeOfReview and application from old world is $relevantReviewForEndemics ', async ({ typeOfLivestock }) => {
      getSessionData.mockImplementation(() => { return { typeOfLivestock, typeOfReview: 'FOLLOW_UP', relevantReviewForEndemics: { type: undefined } } })
      const options = {
        method: 'POST',
        url,
        auth,
        payload: { crumb, vetRCVSNumber: '1234567' },
        headers: { cookie: `crumb=${crumb}` }
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(302)
      expect(res.headers.location).toEqual('/pi-hunt')
      expect(setSessionData).toHaveBeenCalled()
    })
  })
})

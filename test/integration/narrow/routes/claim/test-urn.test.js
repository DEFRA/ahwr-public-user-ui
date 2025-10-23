import * as cheerio from 'cheerio'
import { createServer } from '../../../../../app/server.js'
import expectPhaseBanner from 'assert'
import { getCrumbs } from '../../../../utils/get-crumbs.js'
import { isURNUnique } from '../../../../../app/api-requests/claim-api.js'
import { isVisitDateAfterPIHuntAndDairyGoLive } from '../../../../../app/lib/context-helper.js'
import { getSessionData, setSessionData } from "../../../../../app/session/index.js";

jest.mock('../../../../../app/session/index.js')
jest.mock('../../../../../app/api-requests/claim-api')
// jest.mock('../../../../../app/event/raise-invalid-data-event')
jest.mock('../../../../../app/lib/context-helper.js')

const auth = { credentials: {}, strategy: 'cookie' }
const url = '/test-urn'

describe('Test URN GET', () => {
  let server

  beforeAll(async () => {
    getSessionData.mockImplementation(() => { return { typeOfLivestock: 'beef' } })
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
    test.each([
      { typeOfLivestock: 'beef', typeOfReview: 'FOLLOW_UP', title: 'What’s the laboratory unique reference number (URN) or certificate number of the test results?', reviewTestResults: 'positive' },
      { typeOfLivestock: 'dairy', typeOfReview: 'FOLLOW_UP', title: 'What’s the laboratory unique reference number (URN) or certificate number of the test results?' },
      { typeOfLivestock: 'sheep', typeOfReview: 'REVIEW', title: 'What’s the laboratory unique reference number (URN) for the test results?' },
      { typeOfLivestock: 'pigs', typeOfReview: 'FOLLOW_UP', title: 'What’s the laboratory unique reference number (URN) for the test results?' }
    ])('Return 200 with Title $title when type of species is $typeOfLivestock and type of review is $typeOfReview', async ({ title, typeOfLivestock, typeOfReview, reviewTestResults }) => {
      getSessionData.mockImplementation(() => { return { typeOfLivestock, typeOfReview, reviewTestResults, reference: 'TEMP-6GSE-PIR8' } })
      const options = {
        method: 'GET',
        url,
        auth
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(200)
      const $ = cheerio.load(res.payload)
      expect($('h1').text()).toMatch(title)
      expect($('title').text()).toContain(`${title} - Get funding to improve animal health and welfare`)

      expectPhaseBanner.ok($)
    })

    test.each([
      { typeOfLivestock: 'beef', typeOfReview: 'REVIEW', latestVetVisitApplication: false, backLink: '/vet-rcvs', visitDateAfterPIHuntLive: false },
      { typeOfLivestock: 'beef', typeOfReview: 'FOLLOW_UP', latestVetVisitApplication: true, backLink: '/vet-rcvs', visitDateAfterPIHuntLive: false },
      { typeOfLivestock: 'beef', typeOfReview: 'FOLLOW_UP', latestVetVisitApplication: true, backLink: '/date-of-testing', visitDateAfterPIHuntLive: true },
      { typeOfLivestock: 'beef', typeOfReview: 'FOLLOW_UP', latestVetVisitApplication: false, backLink: '/vet-rcvs', visitDateAfterPIHuntLive: false },
      { typeOfLivestock: 'beef', typeOfReview: 'FOLLOW_UP', latestVetVisitApplication: false, backLink: '/date-of-testing', visitDateAfterPIHuntLive: true },
      { typeOfLivestock: 'dairy', typeOfReview: 'REVIEW', latestVetVisitApplication: false, backLink: '/vet-rcvs', visitDateAfterPIHuntLive: false },
      { typeOfLivestock: 'dairy', typeOfReview: 'FOLLOW_UP', latestVetVisitApplication: false, backLink: '/vet-rcvs', visitDateAfterPIHuntLive: false },
      { typeOfLivestock: 'dairy', typeOfReview: 'FOLLOW_UP', latestVetVisitApplication: false, backLink: '/date-of-testing', visitDateAfterPIHuntLive: true },
      { typeOfLivestock: 'pigs', typeOfReview: 'REVIEW', latestVetVisitApplication: false, backLink: '/vet-rcvs', visitDateAfterPIHuntLive: false },
      { typeOfLivestock: 'pigs', typeOfReview: 'FOLLOW_UP', latestVetVisitApplication: true, backLink: '/vaccination', visitDateAfterPIHuntLive: false },
      { typeOfLivestock: 'pigs', typeOfReview: 'FOLLOW_UP', latestVetVisitApplication: false, backLink: '/vaccination', visitDateAfterPIHuntLive: false }
    ])('backLink when $typeOfLivestock - $typeOfReview and application from old world is $latestVetVisitApplication. Visit after PI hunt live date - $visitDateAfterPIHuntLive ', async ({ typeOfLivestock, typeOfReview, latestVetVisitApplication, backLink, visitDateAfterPIHuntLive }) => {
      isVisitDateAfterPIHuntAndDairyGoLive.mockRestore()
      isVisitDateAfterPIHuntAndDairyGoLive.mockImplementation(() => { return visitDateAfterPIHuntLive === true })
      getSessionData.mockImplementation(() => { return { typeOfLivestock, typeOfReview, latestVetVisitApplication, reference: 'TEMP-6GSE-PIR8' } })
      const options = {
        method: 'GET',
        url,
        auth
      }

      const res = await server.inject(options)
      expect(res.statusCode).toBe(200)
      const $ = cheerio.load(res.payload)
      expect($('.govuk-back-link').attr('href')).toContain(backLink)
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
        payload: { crumb, laboratoryURN: '123' },
        headers: { cookie: `crumb=${crumb}` }
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(302)
      expect(res.headers.location.toString()).toEqual(`/sign-in`)
    })

    test.each([
      { typeOfLivestock: 'beef', typeOfReview: 'REVIEW', nextPageUrl: '/test-results' },
      { typeOfLivestock: 'dairy', typeOfReview: 'REVIEW', nextPageUrl: '/test-results' },
      { typeOfLivestock: 'sheep', typeOfReview: 'REVIEW', nextPageUrl: '/check-answers' },
      { typeOfLivestock: 'pigs', typeOfReview: 'REVIEW', nextPageUrl: '/number-of-fluid-oral-samples' },
      { typeOfLivestock: 'pigs', typeOfReview: 'FOLLOW_UP', nextPageUrl: '/number-of-samples-tested' }
    ])('redirects to check answers page when payload is valid for $typeOfLivestock and $typeOfReview', async ({ nextPageUrl, typeOfLivestock, typeOfReview }) => {
      getSessionData.mockImplementation(() => { return { typeOfLivestock, typeOfReview, laboratoryURN: '12345', organisation: { sbi: '12345678' } } })
      isURNUnique.mockImplementation(() => { return { isURNUnique: true } })
      const options = {
        method: 'POST',
        url,
        auth,
        payload: { crumb, laboratoryURN: '123' },
        headers: { cookie: `crumb=${crumb}` }
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(302)
      expect(res.headers.location.toString()).toEqual(expect.stringContaining(nextPageUrl))
      expect(setSessionData).toHaveBeenCalled()
    })

    test.each([
      { typeOfLivestock: 'beef', typeOfReview: 'FOLLOW_UP', message: 'This test result unique reference number (URN) or certificate number was used in a previous claim.' },
      { typeOfLivestock: 'beef', typeOfReview: 'REVIEW', message: 'This test result unique reference number (URN) was used in a previous claim.' }
    ])('redirects to exception screen when the URN number is not unique', async ({ typeOfLivestock, typeOfReview, message }) => {
      getSessionData
        .mockImplementationOnce(() => { return { typeOfLivestock, typeOfReview, laboratoryURN: '12345', organisation: { sbi: '12345678' } } })
      isURNUnique.mockImplementationOnce(() => { return { isURNUnique: false } })
      const options = {
        method: 'POST',
        url,
        auth,
        payload: { crumb, laboratoryURN: '123' },
        headers: { cookie: `crumb=${crumb}` }
      }

      const res = await server.inject(options)
      const $ = cheerio.load(res.payload)

      expect(res.statusCode).toBe(400)
      expect($('h1').text()).toMatch('You cannot continue with your claim')
      expect($('p').text()).toContain(message)
      // expect(raiseInvalidDataEvent).toHaveBeenCalled()
    })
    test('shows error when payload is invalid', async () => {
      const options = {
        method: 'POST',
        url,
        auth,
        payload: { crumb, laboratoryURN: undefined },
        headers: { cookie: `crumb=${crumb}` }
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(400)
      const $ = cheerio.load(res.payload)
      expect($('h1').text()).toMatch('What’s the laboratory unique reference number (URN) for the test results?')
      expect($('#main-content > div > div > div > div > div > ul > li > a').text()).toMatch('Enter the URN')
      expect($('#laboratoryURN-error').text()).toMatch('Enter the URN')
    })
  })
})

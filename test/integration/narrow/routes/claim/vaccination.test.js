import * as cheerio from 'cheerio'
import { createServer } from '../../../../../app/server.js'
import expectPhaseBanner from 'assert'
import { getCrumbs } from '../../../../utils/get-crumbs.js'
import { getSessionData, setSessionData } from "../../../../../app/session/index.js";

jest.mock('../../../../../app/session/index.js')

describe('Vaccination test', () => {
  const auth = { credentials: {}, strategy: 'cookie' }
  const url = '/vaccination'
  let server

  beforeAll(async () => {
    getSessionData.mockImplementation(() => { return { typeOfLivestock: 'pigs', reference: 'TEMP-6GSE-PIR8' } })
    setSessionData.mockImplementation(() => { })

    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    jest.resetAllMocks()
    await server.stop()
  })

  describe(`GET ${url} route`, () => {
    test('Returns 200', async () => {
      const options = {
        method: 'GET',
        url,
        auth
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(200)
      const $ = cheerio.load(res.payload)
      expect($('title').text()).toContain('Herd Vaccination Status - Get funding to improve animal health and welfare')
      expect($('h1').text()).toMatch('What is the herd porcine reproductive and respiratory syndrome (PRRS) vaccination status?')
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

    test.each([
      { typeOfLivestock: 'pigs', vetVisitsReviewTestResults: false, backLink: '/vet-rcvs' },
      { typeOfLivestock: 'pigs', vetVisitsReviewTestResults: true, backLink: '/test-results' }
    ])('backLink when species is pigs and application from old world is $vetVisitsReviewTestResults', async ({ typeOfLivestock, vetVisitsReviewTestResults, backLink }) => {
      getSessionData.mockImplementation(() => { return { typeOfLivestock, vetVisitsReviewTestResults, reference: 'TEMP-6GSE-PIR8' } })
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
        payload: { crumb, herdVaccinationStatus: 'vaccinated' },
        headers: { cookie: `crumb=${crumb}` }
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(302)
      expect(res.headers.location.toString()).toEqual(`/sign-in`)
    })

    test.each([
      { herdVaccinationStatus: undefined, errorMessage: 'Select a vaccination status' },
      { herdVaccinationStatus: null, errorMessage: 'Select a vaccination status' },
      { herdVaccinationStatus: 'impossible', errorMessage: 'Select a vaccination status' }
    ])('returns 400 when payload is invalid - %p', async ({ herdVaccinationStatus, errorMessage }) => {
      const options = {
        method: 'POST',
        url,
        auth,
        payload: { crumb, herdVaccinationStatus },
        headers: { cookie: `crumb=${crumb}` }
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(400)
      const $ = cheerio.load(res.payload)
      expect($('h1').text()).toMatch('What is the herd porcine reproductive and respiratory syndrome (PRRS) vaccination status?')
      expect($('#main-content > div > div > div > div > div > ul > li > a').text()).toMatch(errorMessage)
      expect($('#herdVaccinationStatus-error').text()).toMatch(errorMessage)
    })

    test.each([
      { herdVaccinationStatus: 'vaccinated' },
      { herdVaccinationStatus: 'notVaccinated' }
    ])('returns 200 when payload is valid and stores in session (herdVaccinationStatus= $herdVaccinationStatus)', async ({ herdVaccinationStatus }) => {
      const options = {
        method: 'POST',
        url,
        auth,
        payload: { crumb, herdVaccinationStatus },
        headers: { cookie: `crumb=${crumb}` }
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(302)
      expect(res.headers.location).toEqual('/test-urn')
      expect(setSessionData).toHaveBeenCalled()
    })
  })
})

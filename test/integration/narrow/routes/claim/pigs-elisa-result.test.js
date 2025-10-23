import * as cheerio from 'cheerio'
import { createServer } from '../../../../../app/server.js'
import { getSessionData, setSessionData } from '../../../../../app/session/index.js'
import expectPhaseBanner from 'assert'
import { getCrumbs } from '../../../../utils/get-crumbs.js'

jest.mock('../../../../../app/session/index.js')
// jest.mock('../../../../../app/event/raise-invalid-data-event')

describe('pigs elisa result test', () => {
  const auth = { credentials: {}, strategy: 'cookie' }
  const url = '/pigs-elisa-result'

  let server

  beforeAll(async () => {
    // raiseInvalidDataEvent.mockImplementation(() => {})
    setSessionData.mockImplementation(() => {})
    getSessionData.mockImplementation(() => { return { typeOfLivestock: 'pigs', reference: 'TEMP-6GSE-PIR8' } })

    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
    jest.resetAllMocks()
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
      expect($('h1').text()).toMatch('What was the result of the ELISA test?')
      expect($('title').text()).toContain('What was the result of the ELISA test? - Get funding to improve animal health and welfare - GOV.UKGOV.UK')

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
      jest.resetAllMocks()
    })

    const generateOptionsForElseResult = (elisaResult) => (
      {
        method: 'POST',
        url,
        auth,
        payload: { crumb, elisaResult },
        headers: { cookie: `crumb=${crumb}` }
      })

    test('when not logged in redirects to /sign-in', async () => {
      const options = {
        method: 'POST',
        url,
        payload: { crumb, elisaResult: 'positive' },
        headers: { cookie: `crumb=${crumb}` }
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(302)
      expect(res.headers.location.toString()).toEqual(`/sign-in`)
    })

    test('shows error when payload is invalid', async () => {
      const options = generateOptionsForElseResult('')

      const res = await server.inject(options)

      expect(res.statusCode).toBe(400)
      const $ = cheerio.load(res.payload)
      expect($('h1').text()).toMatch('What was the result of the ELISA test?')
      expect($('#elisaResult-error').text()).toMatch('Select the result of the test')
    })

    test('sets negative result into session and redirects to pigs biosecurity page', async () => {
      const options = generateOptionsForElseResult('negative')

      const res = await server.inject(options)

      expect(res.statusCode).toBe(302)
      expect(res.headers.location.toString()).toEqual('/biosecurity')
      expect(setSessionData).toHaveBeenCalledTimes(2)
      expect(setSessionData).toHaveBeenCalledWith(expect.anything(), 'endemicsClaim', 'pigsElisaTestResult', 'negative')
      expect(setSessionData).toHaveBeenCalledWith(expect.anything(), 'endemicsClaim', 'pigsGeneticSequencing', undefined)
    })

    test('sets positive result into session and redirects to pigs biosecurity page', async () => {
      const options = generateOptionsForElseResult('positive')

      const res = await server.inject(options)

      expect(res.statusCode).toBe(302)
      expect(res.headers.location.toString()).toEqual('/biosecurity')
      expect(setSessionData).toHaveBeenCalledTimes(2)
      expect(setSessionData).toHaveBeenCalledWith(expect.anything(), 'endemicsClaim', 'pigsElisaTestResult', 'positive')
      expect(setSessionData).toHaveBeenCalledWith(expect.anything(), 'endemicsClaim', 'pigsGeneticSequencing', undefined)
    })
  })
})

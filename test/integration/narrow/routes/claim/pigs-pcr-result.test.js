import * as cheerio from 'cheerio'
import { createServer } from '../../../../../app/server.js'
import { getSessionData, setSessionData } from '../../../../../app/session/index.js'
import expectPhaseBanner from 'assert'
import { getCrumbs } from '../../../../utils/get-crumbs.js'

jest.mock('../../../../../app/session/index.js')
// jest.mock('../../../../../app/event/raise-invalid-data-event')

describe('pigs pcr result test', () => {
  const auth = { credentials: {}, strategy: 'cookie' }
  const url = '/pigs-pcr-result'

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
      expect($('h1').text()).toMatch('What was the result of the PCR test?')
      expect($('title').text()).toContain('What was the result of the PCR test? - Get funding to improve animal health and welfare - GOV.UKGOV.UK')

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
      jest.resetAllMocks()
      crumb = await getCrumbs(server)
    })

    test('when not logged in redirects to /sign-in', async () => {
      const options = {
        method: 'POST',
        url,
        payload: { crumb, pcrResult: 'positive' },
        headers: { cookie: `crumb=${crumb}` }
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(302)
      expect(res.headers.location.toString()).toEqual(`/sign-in`)
    })

    test('shows error when payload is invalid', async () => {
      const options = {
        method: 'POST',
        url,
        auth,
        payload: { crumb, pcrResult: '' },
        headers: { cookie: `crumb=${crumb}` }
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(400)
      const $ = cheerio.load(res.payload)
      expect($('h1').text()).toMatch('What was the result of the PCR test?')
      expect($('#pcrResult-error').text()).toMatch('Select the result of the test')
    })

    test('redirects to pigs genetic sequencing page if positive result', async () => {
      const options = {
        method: 'POST',
        url,
        auth,
        payload: { crumb, pcrResult: 'positive' },
        headers: { cookie: `crumb=${crumb}` }
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(302)
      expect(res.headers.location.toString()).toEqual('/pigs-genetic-sequencing')
      expect(setSessionData).toHaveBeenCalledTimes(1)
    })

    test('redirects to pigs biosecurity page if negative result', async () => {
      const options = {
        method: 'POST',
        url,
        auth,
        payload: { crumb, pcrResult: 'negative' },
        headers: { cookie: `crumb=${crumb}` }
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(302)
      expect(res.headers.location.toString()).toEqual('/biosecurity')
      expect(setSessionData).toHaveBeenCalledTimes(2)
    })
  })
})

import * as cheerio from 'cheerio'
import { createServer } from '../../../../../app/server.js'
import expectPhaseBanner from 'assert'
import { getCrumbs } from '../../../../utils/get-crumbs.js'
import { getSessionData, setSessionData } from "../../../../../app/session/index.js";

jest.mock('../../../../../app/session/index.js')

describe('Test Results test', () => {
  const auth = { credentials: {}, strategy: 'cookie' }
  const url = '/sheep-tests'

  let server

  beforeAll(async () => {
    getSessionData.mockImplementation(() => {
      return { typeOfLivestock: 'sheep' }
    })
    setSessionData.mockImplementation(() => { })

    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
    jest.resetAllMocks()
  })

  describe(`GET ${url} route`, () => {
    test('returns 200', async () => {
      getSessionData.mockImplementation(() => {
        return { sheepEndemicsPackage: 'reducedExternalParasites', reference: 'TEMP-6GSE-PIR8' }
      })

      const options = {
        method: 'GET',
        url,
        auth
      }

      const res = await server.inject(options)
      const $ = cheerio.load(res.payload)

      expect(res.statusCode).toBe(200)
      expect($('h1').text()).toMatch('Which disease or condition did the vet take samples to test for?')
      expect($('title').text()).toMatch('Which disease or condition did the vet take samples to test for? - Get funding to improve animal health and welfare')
      expect($('.govuk-back-link').attr('href')).toContain('/sheep-endemics-package')

      expectPhaseBanner.ok($)
    })
  })

  describe(`POST ${url} route`, () => {
    let crumb

    beforeEach(async () => {
      crumb = await getCrumbs(server)
    })

    test('returns 400 when user didnt select any test', async () => {
      getSessionData.mockImplementation(() => {
        return { sheepEndemicsPackage: 'reducedExternalParasites' }
      })

      const options = {
        method: 'POST',
        url,
        auth,
        payload: { crumb },
        headers: { cookie: `crumb=${crumb}` }
      }

      const res = await server.inject(options)
      const $ = cheerio.load(res.payload)

      expect(res.statusCode).toBe(400)
      expect($('h1').text()).toMatch('Which disease or condition did the vet take samples to test for?')
      expect($('title').text()).toMatch('Which disease or condition did the vet take samples to test for? - Get funding to improve animal health and welfare')
      expect($('a').text()).toMatch('Select a disease or condition')

      expectPhaseBanner.ok($)
    })

    test('returns 200  when user select multiple tests', async () => {
      getSessionData.mockImplementation(() => {
        return { sheepEndemicsPackage: 'reducedExternalParasites', sheepTestResults: [{ diseaseType: 'sheepScab', result: 'positive' }] }
      })

      const options = {
        method: 'POST',
        url,
        auth,
        payload: { crumb, sheepTests: ['flystrike', 'sheepScab', 'other'] },
        headers: { cookie: `crumb=${crumb}` }
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(302)
      expect(res.headers.location).toEqual('/sheep-test-results')
      expect(setSessionData).toHaveBeenCalled()
    })

    test('returns 200  when user select one test', async () => {
      getSessionData.mockImplementation(() => {
        return { sheepEndemicsPackage: 'reducedExternalParasites' }
      })

      const options = {
        method: 'POST',
        url,
        auth,
        payload: { crumb, sheepTests: 'test' },
        headers: { cookie: `crumb=${crumb}` }
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(302)
      expect(res.headers.location).toEqual('/sheep-test-results')
      expect(setSessionData).toHaveBeenCalled()
    })
  })
})

import * as cheerio from 'cheerio'
import { createServer } from '../../../../../app/server.js'
import expectPhaseBanner from 'assert'
import { getCrumbs } from '../../../../utils/get-crumbs.js'
import { getSessionData, setSessionData } from "../../../../../app/session/index.js";

jest.mock('../../../../../app/session/index.js')

describe('Test Results test', () => {
  const auth = { credentials: {}, strategy: 'cookie' }
  const url = '/test-results'
  let server

  beforeAll(async () => {
    getSessionData.mockImplementation(() => { return { typeOfLivestock: 'beef', reference: 'TEMP-6GSE-PIR8' } })
    setSessionData.mockImplementation(() => { })

    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    jest.resetAllMocks()
    await server.stop()
  })

  describe(`GET ${url} route`, () => {
    test.each([
      { typeOfReview: 'FOLLOW_UP', question: 'What was the follow-up test result?' },
      { typeOfReview: 'REVIEW', question: 'What was the test result?' }
    ])('returns 200', async ({ typeOfReview, question }) => {
      getSessionData.mockImplementation(() => { return { typeOfReview, reference: 'TEMP-6GSE-PIR8' } })

      const options = {
        method: 'GET',
        url,
        auth
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(200)
      const $ = cheerio.load(res.payload)
      expect($('h1').text()).toMatch(question)
      expect($('title').text()).toContain(
        `${question} - Get funding to improve animal health and welfare`
      )

      expectPhaseBanner.ok($)
    })

    test.each([
      { typeOfLivestock: 'beef', typeOfReview: 'REVIEW', backLink: '/test-urn' },
      { typeOfLivestock: 'dairy', typeOfReview: 'REVIEW', backLink: '/test-urn' },
      { typeOfLivestock: 'pigs', typeOfReview: 'REVIEW', backLink: '/number-of-fluid-oral-samples' },
      { typeOfLivestock: 'sheep', typeOfReview: 'FOLLOW_UP', backLink: '/disease-status' },
      { typeOfLivestock: 'beef', typeOfReview: 'FOLLOW_UP', backLink: '/test-urn' },
      { typeOfLivestock: 'dairy', typeOfReview: 'FOLLOW_UP', backLink: '/test-urn' }
    ])('backLink when species $typeOfLivestock and type of review is $typeOfReview', async ({ typeOfLivestock, typeOfReview, backLink }) => {
      getSessionData.mockImplementation(() => { return { typeOfLivestock, typeOfReview, reference: 'TEMP-6GSE-PIR8' } })
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
        payload: { crumb, testResults: 'positive' },
        headers: { cookie: `crumb=${crumb}` }
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(302)
      expect(res.headers.location.toString()).toEqual(`/sign-in`)
    })

    test.each([
      { typeOfLivestock: 'beef', typeOfReview: 'FOLLOW_UP', nextPageURL: '/biosecurity' },
      { typeOfLivestock: 'dairy', typeOfReview: 'FOLLOW_UP', nextPageURL: '/biosecurity' },
      { typeOfLivestock: 'beef', typeOfReview: 'REVIEW', nextPageURL: '/check-answers' }
    ])('Redirect $nextPageURL When species $typeOfLivestock and type of review is $typeOfReview', async ({ typeOfLivestock, typeOfReview, nextPageURL }) => {
      getSessionData.mockImplementation(() => { return { typeOfLivestock, typeOfReview } })

      const options = {
        method: 'POST',
        url,
        auth,
        payload: { crumb, testResults: 'positive' },
        headers: { cookie: `crumb=${crumb}` }
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(302)
      expect(res.headers.location.toString()).toEqual(expect.stringContaining(nextPageURL))
      expect(setSessionData).toHaveBeenCalled()
    })

    test('shows error when payload is invalid', async () => {
      const options = {
        method: 'POST',
        url,
        auth,
        payload: { crumb, testResults: undefined },
        headers: { cookie: `crumb=${crumb}` }
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(400)
      const $ = cheerio.load(res.payload)
      expect($('h1').text()).toMatch('What was the test result?')
      expect($('#main-content > div > div > div > div > div > ul > li > a').text()).toMatch('Select a test result')
      expect($('#testResults-error').text()).toMatch('Select a test result')
    })
  })
})

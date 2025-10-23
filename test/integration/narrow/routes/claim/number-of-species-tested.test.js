import * as cheerio from 'cheerio'
import { createServer } from '../../../../../app/server.js'
import { getSessionData, setSessionData } from '../../../../../app/session/index.js'
import expectPhaseBanner from 'assert'
import { getCrumbs } from '../../../../utils/get-crumbs.js'
import { isVisitDateAfterPIHuntAndDairyGoLive } from '../../../../../app/lib/context-helper.js'

jest.mock('../../../../../app/session/index.js')
// jest.mock('../../../../../app/event/raise-invalid-data-event')
jest.mock('../../../../../app/lib/context-helper.js')

describe('Number of species tested test', () => {
  const auth = { credentials: {}, strategy: 'cookie' }
  const url = '/number-of-species-tested'

  let server

  beforeAll(async () => {
    // raiseInvalidDataEvent.mockImplementation(() => {})
    setSessionData.mockImplementation(() => {})
    getSessionData.mockImplementation(() => { return { typeOfLivestock: 'pigs', reference: 'TEMP-6GSE-PIR8' } })

    server = await createServer()
    await server.initialize()
    isVisitDateAfterPIHuntAndDairyGoLive.mockImplementation(() => { return true })
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
      expect($('h1').text()).toMatch('How many animals were samples taken from?')
      expect($('title').text().trim()).toContain('How many animals were samples taken from? - Get funding to improve animal health and welfare')
      expectPhaseBanner.ok($)
    })

    test.each([
      { typeOfLivestock: 'beef', typeOfReview: 'REVIEW' },
      { typeOfLivestock: 'dairy', typeOfReview: 'REVIEW' }
    ])('returns 200 for review $typeOfLivestock journey', async ({ typeOfLivestock, typeOfReview }) => {
      getSessionData.mockImplementationOnce(() => { return { typeOfLivestock, typeOfReview } })
        .mockImplementationOnce(() => { return { reference: 'TEMP-6GSE-PIR8' } })
        .mockImplementationOnce(() => { return { typeOfLivestock, typeOfReview } })

      const options = {
        method: 'GET',
        url,
        auth
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(200)
      const $ = cheerio.load(res.payload)
      expect($('h1').text()).toMatch(typeOfLivestock === 'dairy' ? 'How many animals were samples taken from or assessed?' : 'How many animals were samples taken from?')
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
      jest.clearAllMocks()
    })

    test('when not logged in redirects to /sign-in', async () => {
      const options = {
        method: 'POST',
        url,
        payload: { crumb, numberAnimalsTested: '123' },
        headers: { cookie: `crumb=${crumb}` }
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(302)
      expect(res.headers.location.toString()).toEqual(`/sign-in`)
    })

    test.each([
      { numberAnimalsTested: '%%%%%%%%%%', error: 'The amount of animals samples were taken from must only include numbers' },
      { numberAnimalsTested: '6697979779779', error: 'The number of animals tested should not exceed 9999' },
      { numberAnimalsTested: '', error: 'Enter the number of animals tested or assessed' }
    ])('show error message when the number of animals tested is not valid', async ({ numberAnimalsTested, error }) => {
      getSessionData.mockImplementation(() => { return { typeOfLivestock: 'dairy', typeOfReview: 'REVIEW' } })
      const options = {
        method: 'POST',
        url,
        auth,
        payload: { crumb, numberAnimalsTested },
        headers: { cookie: `crumb=${crumb}` }
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(400)
      const $ = cheerio.load(res.payload)
      expect($('h1').text()).toMatch('How many animals were samples taken from or assessed?')
      expect($('#main-content > div > div > div > div > div > ul > li > a').text()).toMatch(error)
      expect($('#numberAnimalsTested-error').text()).toMatch(error)
    })
    test.each([
      { typeOfLivestock: 'beef', typeOfReview: 'REVIEW', numberAnimalsTested: '5' },
      { typeOfLivestock: 'pigs', typeOfReview: 'REVIEW', numberAnimalsTested: '30' },
      { typeOfLivestock: 'sheep', typeOfReview: 'REVIEW', numberAnimalsTested: '10' },
      { typeOfLivestock: 'dairy', typeOfReview: 'REVIEW', numberAnimalsTested: '5' },
      { typeOfLivestock: 'beef', typeOfReview: 'FOLLOW_UP', numberAnimalsTested: '11' },
      { typeOfLivestock: 'pigs', typeOfReview: 'FOLLOW_UP', numberAnimalsTested: '30' },
      { typeOfLivestock: 'sheep', typeOfReview: 'FOLLOW_UP', numberAnimalsTested: '1' },
      { typeOfLivestock: 'dairy', typeOfReview: 'FOLLOW_UP', numberAnimalsTested: '1' }
    ])('Continue to vet name screen if the number of $typeOfLivestock is eligible', async ({ typeOfLivestock, typeOfReview, numberAnimalsTested }) => {
      getSessionData.mockImplementation(() => { return { typeOfLivestock, typeOfReview } })
      const options = {
        method: 'POST',
        url,
        auth,
        payload: { crumb, numberAnimalsTested },
        headers: { cookie: `crumb=${crumb}` }
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(302)
      expect(res.headers.location).toEqual('/vet-name')
      expect(setSessionData).toHaveBeenCalled()
    })

    test.each([
      { typeOfLivestock: 'beef', typeOfReview: 'REVIEW', numberAnimalsTested: '4' },
      { typeOfLivestock: 'pigs', typeOfReview: 'REVIEW', numberAnimalsTested: '20' },
      { typeOfLivestock: 'sheep', typeOfReview: 'REVIEW', numberAnimalsTested: '8' },
      { typeOfLivestock: 'dairy', typeOfReview: 'REVIEW', numberAnimalsTested: '3' },
      { typeOfLivestock: 'pigs', typeOfReview: 'FOLLOW_UP', numberAnimalsTested: '18' },
      { typeOfLivestock: 'beef', typeOfReview: 'FOLLOW_UP', numberAnimalsTested: '9' }
    ])('shows error page when number of $typeOfLivestock to be tested is not eligible', async ({ typeOfLivestock, typeOfReview, numberAnimalsTested }) => {
      getSessionData.mockImplementationOnce(() => { return { typeOfLivestock, typeOfReview } })
      const options = {
        method: 'POST',
        url,
        auth,
        payload: { crumb, numberAnimalsTested },
        headers: { cookie: `crumb=${crumb}` }
      }

      const res = await server.inject(options)

      const title = typeOfLivestock === 'sheep' ? 'There could be a problem with your claim' : 'You cannot continue with your claim'

      expect(res.statusCode).toBe(400)
      const $ = cheerio.load(res.payload)
      expect($('h1').text()).toMatch(title)
      // expect(raiseInvalidDataEvent).toHaveBeenCalled()
    })
    test('shows error page when number of animals tested is 0 ', async () => {
      getSessionData.mockImplementation(() => { return { typeOfLivestock: 'sheep', typeOfReview: 'FOLLOW_UP' } })
      const options = {
        method: 'POST',
        url,
        auth,
        payload: { crumb, numberAnimalsTested: '0' },
        headers: { cookie: `crumb=${crumb}` }
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(400)
      const $ = cheerio.load(res.payload)
      expect($('h1').text()).toMatch('How many sheep were samples taken from or assessed?')
      expect($('#main-content > div > div > div > div > div > ul > li > a').text()).toMatch('The number of animals tested cannot be 0')
      expect($('#numberAnimalsTested-error').text()).toMatch('The number of animals tested cannot be 0')
    })

    test('error page shows 2 bullet points when optional PI Hunt relevant', async () => {
      getSessionData.mockImplementation(() => { return { typeOfLivestock: 'beef', typeOfReview: 'REVIEW' } })
      isVisitDateAfterPIHuntAndDairyGoLive.mockImplementation(() => { return true })
      const options = {
        method: 'POST',
        url,
        auth,
        payload: { crumb, numberAnimalsTested: '1' },
        headers: { cookie: `crumb=${crumb}` }
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(400)
      const $ = cheerio.load(res.payload)
      expect($('#main-content > div > div > ul').children().length).toBe(2)
    })

    test('error page shows 3 bullet points when optional PI Hunt env not relevant', async () => {
      getSessionData.mockImplementation(() => { return { typeOfLivestock: 'beef', typeOfReview: 'REVIEW' } })
      isVisitDateAfterPIHuntAndDairyGoLive.mockImplementation(() => { return false })

      const options = {
        method: 'POST',
        url,
        auth,
        payload: { crumb, numberAnimalsTested: '1' },
        headers: { cookie: `crumb=${crumb}` }
      }

      const res = await server.inject(options)

      expect(res.statusCode).toBe(400)
      const $ = cheerio.load(res.payload)
      expect($('#main-content > div > div > ul').children().length).toBe(3)
    })
  })
})

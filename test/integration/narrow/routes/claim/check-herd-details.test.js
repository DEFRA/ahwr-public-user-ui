import * as cheerio from 'cheerio'
import { createServer } from '../../../../../app/server.js'
import { getCrumbs } from '../../../../utils/get-crumbs.js'
import expectPhaseBanner from 'assert'
import { getSessionData, setSessionData } from '../../../../../app/session/index.js'
import { getNextMultipleHerdsPage } from '../../../../../app/lib/get-next-multiple-herds-page.js'

jest.mock('../../../../../app/session/index.js')
jest.mock('../../../../../app/lib/get-next-multiple-herds-page.js')

const assertLinkExistsFor = ($, spanText) => {
  const link = $('a.govuk-link').filter((_, el) => {
    return $(el).text().trim() === 'Change ' + spanText
  })
  return link.length > 0
}

describe('/check-herd-details tests', () => {
  const url = `/check-herd-details`
  const auth = {
    credentials: { reference: '1111', sbi: '111111111' },
    strategy: 'cookie'
  }
  let server
  let crumb

  beforeAll(async () => {
    setSessionData.mockImplementation(() => { })
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  describe('GET', () => {
    test('returns 200 with herd labels when species beef, also change links are correct', async () => {
      getSessionData.mockReturnValue({
        reference: 'TEMP-6GSE-PIR8',
        typeOfReview: 'REVIEW',
        typeOfLivestock: 'beef',
        herdId: '909bb722-3de1-443e-8304-0bba8fx§922050',
        herdVersion: 1,
        herdName: 'Commercial Herd',
        herdCph: '22/333/4444',
        isOnlyHerdOnSbi: 'no',
        herdReasons: ['differentBreed']
      })

      const res = await server.inject({ method: 'GET', url, auth })

      expect(res.statusCode).toBe(200)
      const $ = cheerio.load(res.payload)
      expect($('title').text().trim()).toContain('Check herd details - Get funding to improve animal health and welfare - GOV.UKGOV.UK')
      expect($('.govuk-back-link').attr('href')).toContain('/enter-herd-details')
      expect(assertLinkExistsFor($, 'CPH number')).toBeTruthy()
      expect(assertLinkExistsFor($, 'herd details')).toBeTruthy()
      expect($('h1').text().trim()).toBe('Check herd details')
      expect(assertLinkExistsFor($, 'Only herd associated with SBI')).toBeTruthy()
      expectPhaseBanner.ok($)
    })

    test('returns 200 and displays flock labels when species is sheep', async () => {
      getSessionData.mockReturnValue({
        reference: 'TEMP-6GSE-PIR8',
        typeOfReview: 'REVIEW',
        typeOfLivestock: 'sheep',
        herdId: '909bb722-3de1-443e-8304-0bba8f922050',
        herdVersion: 1,
        herdName: 'Commercial Herd',
        herdCph: '22/333/4444',
        isOnlyHerdOnSbi: 'no',
        herdReasons: ['differentBreed']
      })

      const res = await server.inject({ method: 'GET', url, auth })

      expect(res.statusCode).toBe(200)
      const $ = cheerio.load(res.payload)
      expect($('title').text().trim()).toContain('Check flock details - Get funding to improve animal health and welfare - GOV.UKGOV.UK')
      expect($('.govuk-back-link').attr('href')).toContain('/enter-herd-details')
      expect(assertLinkExistsFor($, 'CPH number')).toBeTruthy()
      expect(assertLinkExistsFor($, 'flock details')).toBeTruthy()
      expect(assertLinkExistsFor($, 'Only flock associated with SBI')).toBeTruthy()
      expect($('h1').text().trim()).toBe('Check flock details')
      expectPhaseBanner.ok($)
    })

    test('returns 200 and backLink to isOnlyHerdOnSbi when isOnlyHerdOnSbi is yes', async () => {
      getSessionData.mockReturnValue({
        reference: 'TEMP-6GSE-PIR8',
        typeOfReview: 'REVIEW',
        typeOfLivestock: 'beef',
        herdId: '909bb722-3de1-443e-8304-0bba8f922050',
        herdVersion: 1,
        herdName: 'Commercial Herd',
        herdCph: '22/333/4444',
        isOnlyHerdOnSbi: 'yes',
        herdReasons: ['onlyHerd']
      })

      const res = await server.inject({ method: 'GET', url, auth })

      expect(res.statusCode).toBe(200)
      const $ = cheerio.load(res.payload)
      expect($('title').text().trim()).toContain('Check herd details - Get funding to improve animal health and welfare - GOV.UKGOV.UK')
      expect($('.govuk-back-link').attr('href')).toContain('/herd-others-on-sbi')
      expect(assertLinkExistsFor($, 'CPH number')).toBeTruthy()
      expect(assertLinkExistsFor($, 'Only herd associated with SBI')).toBeTruthy()
      expect(assertLinkExistsFor($, 'herd details')).toBeFalsy()
      expectPhaseBanner.ok($)
    })

    test('returns 200 and backLink to enterHerdDetails when isOnlyHerdOnSbi is no', async () => {
      getSessionData.mockReturnValue({
        reference: 'TEMP-6GSE-PIR8',
        typeOfReview: 'REVIEW',
        typeOfLivestock: 'beef',
        herdId: '909bb722-3de1-443e-8304-0bba8f922050',
        herdVersion: 1,
        herdName: 'Commercial Herd',
        herdCph: '22/333/4444',
        isOnlyHerdOnSbi: 'no',
        herdReasons: ['differentBreed']
      })

      const res = await server.inject({ method: 'GET', url, auth })

      expect(res.statusCode).toBe(200)
      const $ = cheerio.load(res.payload)
      expect($('title').text().trim()).toContain('Check herd details - Get funding to improve animal health and welfare - GOV.UKGOV.UK')
      expect($('.govuk-back-link').attr('href')).toContain('/enter-herd-details')
      expect(assertLinkExistsFor($, 'CPH number')).toBeTruthy()
      expect(assertLinkExistsFor($, 'Only herd associated with SBI')).toBeTruthy()
      expect(assertLinkExistsFor($, 'herd details')).toBeTruthy()
      expectPhaseBanner.ok($)
    })

    test('should display others on sbi when existing herd and it was the only herd', async () => {
      getSessionData.mockReturnValue({
        reference: 'TEMP-6GSE-PIR8',
        typeOfReview: 'REVIEW',
        typeOfLivestock: 'beef',
        herdId: '909bb722-3de1-443e-8304-0bba8fx5922050',
        herdVersion: 1,
        herdName: 'Commercial Herd',
        herdCph: '22/333/4444',
        isOnlyHerdOnSbi: 'no',
        herdReasons: ['differentBreed'],
        herds: [{
          id: '909bb722-3de1-443e-8304-0bba8fx5922050',
          reasons: ['onlyHerd']
        }]
      })

      const res = await server.inject({ method: 'GET', url, auth })

      expect(res.statusCode).toBe(200)
      const $ = cheerio.load(res.payload)
      expect($('title').text().trim()).toContain('Check herd details - Get funding to improve animal health and welfare - GOV.UKGOV.UK')
      expect($('.govuk-back-link').attr('href')).toContain('/enter-herd-details')
      expect(assertLinkExistsFor($, 'CPH number')).toBeTruthy()
      expect(assertLinkExistsFor($, 'herd details')).toBeTruthy()
      expect($('h1').text().trim()).toBe('Check herd details')
      expect(assertLinkExistsFor($, 'Only herd associated with SBI')).toBeTruthy()
      expectPhaseBanner.ok($)
    })

    test('should display others on sbi when no existing herds', async () => {
      getSessionData.mockReturnValue({
        reference: 'TEMP-6GSE-PIR8',
        typeOfReview: 'REVIEW',
        typeOfLivestock: 'beef',
        herdId: '909bb722-3de1-443e-8304-0bba8fx5922050',
        herdVersion: 1,
        herdName: 'Commercial Herd',
        herdCph: '22/333/4444',
        isOnlyHerdOnSbi: 'no',
        herdReasons: ['differentBreed'],
        herds: []
      })

      const res = await server.inject({ method: 'GET', url, auth })

      expect(res.statusCode).toBe(200)
      const $ = cheerio.load(res.payload)
      expect($('title').text().trim()).toContain('Check herd details - Get funding to improve animal health and welfare - GOV.UKGOV.UK')
      expect($('.govuk-back-link').attr('href')).toContain('/enter-herd-details')
      expect(assertLinkExistsFor($, 'CPH number')).toBeTruthy()
      expect(assertLinkExistsFor($, 'herd details')).toBeTruthy()
      expect($('h1').text().trim()).toBe('Check herd details')
      expect(assertLinkExistsFor($, 'Only herd associated with SBI')).toBeTruthy()
      expectPhaseBanner.ok($)
    })

    test('should not display others on sbi when existing herd and it was not the only herd', async () => {
      getSessionData.mockReturnValue({
        reference: 'TEMP-6GSE-PIR8',
        typeOfReview: 'REVIEW',
        typeOfLivestock: 'beef',
        herdId: '909bb722-3de1-443e-8304-0bba8fx5922050',
        herdVersion: 1,
        herdName: 'Commercial Herd',
        herdCph: '22/333/4444',
        isOnlyHerdOnSbi: 'no',
        herdReasons: ['differentBreed'],
        herds: [{
          id: '909bb722-3de1-443e-8304-0bba8fx5922050'
        }]
      })

      const res = await server.inject({ method: 'GET', url, auth })

      expect(res.statusCode).toBe(200)
      const $ = cheerio.load(res.payload)
      expect($('title').text().trim()).toContain('Check herd details - Get funding to improve animal health and welfare - GOV.UKGOV.UK')
      expect($('.govuk-back-link').attr('href')).toContain('/enter-herd-details')
      expect(assertLinkExistsFor($, 'CPH number')).toBeTruthy()
      expect(assertLinkExistsFor($, 'herd details')).toBeTruthy()
      expect($('h1').text().trim()).toBe('Check herd details')
      expect(assertLinkExistsFor($, 'Only herd associated with SBI')).toBeFalsy()
      expectPhaseBanner.ok($)
    })
  })

  describe('POST', () => {
    beforeAll(async () => {
      crumb = await getCrumbs(server)
    })

    const validPayloadWithPreviousClaimsWithoutHerd = {
      reference: 'TEMP-6GSE-PIR8',
      typeOfReview: 'REVIEW',
      typeOfLivestock: 'beef',
      herdId: '909bb722-3de1-443e-8304-0bba8f922050',
      herdVersion: 1,
      herdName: 'Commercial Herd',
      herdCph: '22/333/4444',
      isOnlyHerdOnSbi: 'no',
      herdReasons: ['differentBreed'],
      previousClaims: [
        { createdAt: '2025-04-01T00:00:00.000Z', data: { typeOfReview: 'REVIEW', typeOfLivestock: 'beef' } }
      ]
    }

    test('navigates to same-herd page when there are previous claims but none have a herd', async () => {
      getSessionData.mockReturnValue(validPayloadWithPreviousClaimsWithoutHerd)

      const res = await server.inject({ method: 'POST', url, auth, payload: { crumb }, headers: { cookie: `crumb=${crumb}` } })

      expect(res.statusCode).toBe(302)
      expect(res.headers.location).toEqual('/same-herd')
    })

    test('navigates to date-of-testing page when no previous claims', async () => {
      getSessionData.mockReturnValue({
        ...validPayloadWithPreviousClaimsWithoutHerd,
        previousClaims: []
      })
      getNextMultipleHerdsPage.mockReturnValue('/date-of-testing')

      const res = await server.inject({ method: 'POST', url, auth, payload: { crumb }, headers: { cookie: `crumb=${crumb}` } })

      expect(res.statusCode).toBe(302)
      expect(res.headers.location).toEqual('/date-of-testing')
    })

    test('navigates to date-of-testing page when at least one previous claim has herd', async () => {
      getSessionData.mockReturnValue({
        ...validPayloadWithPreviousClaimsWithoutHerd,
        previousClaims: [
          { createdAt: '2025-03-01T00:00:00.000Z', data: { typeOfReview: 'REVIEW', typeOfLivestock: 'beef' } },
          { createdAt: '2025-04-01T00:00:00.000Z', data: { typeOfReview: 'REVIEW', typeOfLivestock: 'beef' }, herd: { id: 'abaf864a-bda6-49b0-a17f-4a170fedd9c1' } },
          { createdAt: '2025-03-10T00:00:00.000Z', data: { typeOfReview: 'REVIEW', typeOfLivestock: 'beef' } }
        ]
      })
      getNextMultipleHerdsPage.mockReturnValue('/date-of-testing')

      const res = await server.inject({ method: 'POST', url, auth, payload: { crumb }, headers: { cookie: `crumb=${crumb}` } })

      expect(res.statusCode).toBe(302)
      expect(res.headers.location).toEqual('/date-of-testing')
    })
  })
})

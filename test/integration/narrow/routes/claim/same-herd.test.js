import * as cheerio from 'cheerio'
import { createServer } from '../../../../../app/server.js'
import { getCrumbs } from '../../../../utils/get-crumbs.js'
import expectPhaseBanner from 'assert'
import {
  getSessionData,
  removeSessionDataForSameHerdChange, setSessionData
} from "../../../../../app/session/index.js";
import { canMakeClaim } from '../../../../../app/lib/can-make-claim.js'
import { getReviewWithinLast10Months } from "../../../../../app/lib/claim-helper.js";

jest.mock('../../../../../app/session/index.js')
jest.mock('../../../../../app/api-requests/claim-api')
jest.mock('../../../../../app/lib/can-make-claim.js')
jest.mock('../../../../../app/lib/claim-helper.js')
// jest.mock('../../../../../app/event/raise-invalid-data-event')

describe('select-the-herd tests', () => {
  const url = '/same-herd'
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
    test('returns 200 with flock labels when species sheep and display type value from previousClaims', async () => {
      getSessionData.mockReturnValue({
        reference: 'TEMP-6GSE-PIR8',
        typeOfReview: 'FOLLOW_UP',
        typeOfLivestock: 'sheep',
        previousClaims: [
          { createdAt: '2025-04-01T00:00:00.000Z', data: { claimType: 'REVIEW', typeOfLivestock: 'beef' } },
          { createdAt: '2025-04-01T00:00:00.000Z', data: { claimType: 'REVIEW', typeOfLivestock: 'sheep' } },
          { createdAt: '2025-04-28T00:00:00.000Z', data: { claimType: 'REVIEW', typeOfLivestock: 'sheep', dateOfVisit: '2025-04-14T00:00:00.000Z' } },
          { createdAt: '2025-04-30T00:00:00.000Z', data: { claimType: 'REVIEW', typeOfLivestock: 'beef' } }
        ],
        herds: []
      })

      const res = await server.inject({ method: 'GET', url, auth })

      expect(res.statusCode).toBe(200)
      const $ = cheerio.load(res.payload)
      expect($('title').text().trim()).toContain('Is this the same flock you have previously claimed for? - Get funding to improve animal health and welfare - GOV.UKGOV.UK')
      expect($('.govuk-back-link').attr('href')).toContain('/check-herd-details')
      expectPhaseBanner.ok($)

      const valueInTypeColumn = $('.govuk-summary-list__row')
        .filter((_, el) => $(el).find('.govuk-summary-list__key').text().trim() === 'Type')
        .first().find('.govuk-summary-list__value').text().trim()
      expect(valueInTypeColumn).toBe('Review')
    })

    test('returns 200 with herd labels when species beef, also selects correct herd', async () => {
      getSessionData.mockReturnValue({
        reference: 'TEMP-6GSE-PIR8',
        typeOfReview: 'REVIEW',
        typeOfLivestock: 'beef',
        previousClaims: [],
        herds: [],
        herdSame: 'yes'
      })

      const res = await server.inject({ method: 'GET', url, auth })

      expect(res.statusCode).toBe(200)
      const $ = cheerio.load(res.payload)
      expect($('title').text().trim()).toContain('Is this the same herd you have previously claimed for? - Get funding to improve animal health and welfare - GOV.UKGOV.UK')
      expect($('.govuk-back-link').attr('href')).toContain('/check-herd-details')
      expect($('.govuk-radios__input[value="yes"]').is(':checked')).toBeTruthy()
      expectPhaseBanner.ok($)
    })
  })

  describe('POST', () => {
    beforeAll(async () => {
      crumb = await getCrumbs(server)
    })

    test('navigates to date of testing when herdSame is yes and type of claim is review', async () => {
      getSessionData.mockReturnValue({
        reference: 'TEMP-6GSE-PIR8',
        typeOfReview: 'REVIEW',
        typeOfLivestock: 'sheep',
        previousClaims: [
          { createdAt: '2025-04-01T00:00:00.000Z', data: { claimType: 'REVIEW', typeOfLivestock: 'beef' } },
          { createdAt: '2025-04-01T00:00:00.000Z', data: { claimType: 'REVIEW', typeOfLivestock: 'sheep' } },
          { createdAt: '2025-04-28T00:00:00.000Z', data: { claimType: 'REVIEW', typeOfLivestock: 'sheep', dateOfVisit: '2025-04-14T00:00:00.000Z' } },
          { createdAt: '2025-04-30T00:00:00.000Z', data: { claimType: 'REVIEW', typeOfLivestock: 'beef' } }
        ],
        tempHerdId: 'temp-456'
      })
      const payload = { herdSame: 'yes' }

      const res = await server.inject({ method: 'POST', url, auth, payload: { crumb, ...payload }, headers: { cookie: `crumb=${crumb}` } })

      expect(res.statusCode).toBe(302)
      expect(res.headers.location).toEqual('/date-of-testing')
      expect(setSessionData).toHaveBeenCalledTimes(1)
      expect(setSessionData).toHaveBeenCalledWith(expect.any(Object), 'endemicsClaim', 'herdSame', 'yes')
    })

    test('navigates to date of testing when herdSame is yes and type of claim is endemics', async () => {
      getSessionData.mockReturnValue({
        reference: 'TEMP-6GSE-PIR8',
        typeOfReview: 'FOLLOW_UP',
        typeOfLivestock: 'sheep',
        previousClaims: [
          { createdAt: '2025-04-01T00:00:00.000Z', data: { claimType: 'REVIEW', typeOfLivestock: 'beef' } },
          { createdAt: '2025-04-01T00:00:00.000Z', data: { claimType: 'REVIEW', typeOfLivestock: 'sheep' } },
          { createdAt: '2025-04-28T00:00:00.000Z', data: { claimType: 'REVIEW', typeOfLivestock: 'sheep', dateOfVisit: '2025-04-14T00:00:00.000Z' } },
          { createdAt: '2025-04-30T00:00:00.000Z', data: { claimType: 'REVIEW', typeOfLivestock: 'beef' } }
        ],
        tempHerdId: 'temp-456'
      })
      const prevReview = { createdAt: '2025-04-28T00:00:00.000Z', data: { claimType: 'REVIEW', typeOfLivestock: 'sheep', dateOfVisit: '2024-01-01T00:00:00.000Z' } }
      getReviewWithinLast10Months.mockReturnValue(prevReview)
      const payload = { herdSame: 'yes' }

      const res = await server.inject({ method: 'POST', url, auth, payload: { crumb, ...payload }, headers: { cookie: `crumb=${crumb}` } })

      expect(res.statusCode).toBe(302)
      expect(res.headers.location).toEqual('/date-of-testing')
      expect(setSessionData).toHaveBeenCalledTimes(2)
      expect(setSessionData).toHaveBeenCalledWith(expect.any(Object), 'endemicsClaim', 'herdSame', 'yes')
      expect(setSessionData).toHaveBeenCalledWith(expect.any(Object), 'endemicsClaim', 'relevantReviewForEndemics', prevReview)
    })

    test('navigates to date of testing when herdSame is no and type of claim is review', async () => {
      getSessionData.mockReturnValue({
        reference: 'TEMP-6GSE-PIR8',
        typeOfReview: 'REVIEW',
        typeOfLivestock: 'sheep',
        previousClaims: [
          { createdAt: '2025-04-01T00:00:00.000Z', data: { claimType: 'REVIEW', typeOfLivestock: 'beef' } },
          { createdAt: '2025-04-01T00:00:00.000Z', data: { claimType: 'REVIEW', typeOfLivestock: 'sheep' } },
          { createdAt: '2025-04-28T00:00:00.000Z', data: { claimType: 'REVIEW', typeOfLivestock: 'sheep', dateOfVisit: '2025-04-14T00:00:00.000Z' } },
          { createdAt: '2025-04-30T00:00:00.000Z', data: { claimType: 'REVIEW', typeOfLivestock: 'beef' } }
        ],
        tempHerdId: 'temp-456'
      })
      const payload = { herdSame: 'no' }

      const res = await server.inject({ method: 'POST', url, auth, payload: { crumb, ...payload }, headers: { cookie: `crumb=${crumb}` } })

      expect(res.statusCode).toBe(302)
      expect(res.headers.location).toEqual('/date-of-testing')
      expect(setSessionData).toHaveBeenCalledTimes(1)
      expect(setSessionData).toHaveBeenCalledWith(expect.any(Object), 'endemicsClaim', 'herdSame', 'no')
    })

    test('display errors with herds labels when payload does not contain herdSame and species is not sheep', async () => {
      getSessionData.mockReturnValue({
        reference: 'TEMP-6GSE-PIR8',
        typeOfReview: 'REVIEW',
        typeOfLivestock: 'beef',
        previousClaims: [
          { createdAt: '2025-04-01T00:00:00.000Z', data: { claimType: 'R', typeOfLivestock: 'beef' } },
          { createdAt: '2025-04-01T00:00:00.000Z', data: { claimType: 'R', typeOfLivestock: 'sheep' } },
          { createdAt: '2025-04-28T00:00:00.000Z', data: { claimType: 'R', typeOfLivestock: 'sheep', dateOfVisit: '2025-04-14T00:00:00.000Z' } },
          { createdAt: '2025-04-30T00:00:00.000Z', data: { claimType: 'R', typeOfLivestock: 'beef' } }
        ],
        herds: []
      })

      const res = await server.inject({ method: 'POST', url, auth, payload: { crumb }, headers: { cookie: `crumb=${crumb}` } })

      const $ = cheerio.load(res.payload)
      expect(res.statusCode).toBe(400)
      expect($('h2.govuk-error-summary__title').text()).toContain('There is a problem')
      expect($('a[href="#herdSame"]').text()).toContain('Select yes if it is the same herd')
    })

    test('display errors with flock labels when payload does not contain herdSame and species is sheep', async () => {
      getSessionData.mockReturnValue({
        reference: 'TEMP-6GSE-PIR8',
        typeOfReview: 'REVIEW',
        typeOfLivestock: 'sheep',
        previousClaims: [
          { createdAt: '2025-04-01T00:00:00.000Z', data: { claimType: 'R', typeOfLivestock: 'beef' } },
          { createdAt: '2025-04-01T00:00:00.000Z', data: { claimType: 'R', typeOfLivestock: 'sheep' } },
          { createdAt: '2025-04-28T00:00:00.000Z', data: { claimType: 'R', typeOfLivestock: 'sheep', dateOfVisit: '2025-04-14T00:00:00.000Z' } },
          { createdAt: '2025-04-30T00:00:00.000Z', data: { claimType: 'R', typeOfLivestock: 'beef' } }
        ],
        herds: []
      })

      const res = await server.inject({ method: 'POST', url, auth, payload: { crumb }, headers: { cookie: `crumb=${crumb}` } })

      const $ = cheerio.load(res.payload)
      expect(res.statusCode).toBe(400)
      expect($('h2.govuk-error-summary__title').text()).toContain('There is a problem')
      expect($('a[href="#herdSame"]').text()).toContain('Select yes if it is the same flock')
    })

    test('error when claiming for follow-up and not within 10months of review', async () => {
      getSessionData.mockReturnValue({
        reference: 'TEMP-6GSE-PIR8',
        typeOfReview: 'FOLLOW_UP',
        typeOfLivestock: 'sheep',
        previousClaims: [
          { createdAt: '2025-04-28T00:00:00.000Z', data: { claimType: 'R', typeOfLivestock: 'sheep', dateOfVisit: '2024-01-01T00:00:00.000Z' } }
        ]
      })
      getReviewWithinLast10Months.mockReturnValue({ createdAt: '2025-04-28T00:00:00.000Z', data: { claimType: 'R', typeOfLivestock: 'sheep', dateOfVisit: '2024-01-01T00:00:00.000Z' } })
      canMakeClaim.mockReturnValue('There must be no more than 10 months between your reviews and follow-ups.')

      const res = await server.inject({ method: 'POST', url, auth, payload: { crumb, herdSame: 'yes' }, headers: { cookie: `crumb=${crumb}` } })

      const $ = cheerio.load(res.payload)
      expect(res.statusCode).toBe(400)
      expect($('h1.govuk-heading-l').text().trim()).toBe('You cannot continue with your claim')
      const link = $('h1.govuk-heading-l').nextAll('p.govuk-body').first().find('a.govuk-link')
      expect(link.attr('href')).toBe('https://www.gov.uk/guidance/farmers-how-to-apply-for-funding-to-improve-animal-health-and-welfare#timing-of-reviews-and-follow-ups')
      expect(link.text().trim()).toBe('There must be no more than 10 months between your reviews and follow-ups.')
      // expect(raiseInvalidDataEvent).toHaveBeenCalled()
    })

    test('error when claiming for follow-up and choose not to link to previous review', async () => {
      getSessionData.mockReturnValue({
        reference: 'TEMP-6GSE-PIR8',
        typeOfReview: 'FOLLOW_UP',
        typeOfLivestock: 'sheep',
        previousClaims: [
          { createdAt: '2025-04-28T00:00:00.000Z', data: { claimType: 'R', typeOfLivestock: 'sheep', dateOfVisit: '2024-01-01T00:00:00.000Z' } }
        ]
      })

      const res = await server.inject({ method: 'POST', url, auth, payload: { crumb, herdSame: 'no' }, headers: { cookie: `crumb=${crumb}` } })

      const $ = cheerio.load(res.payload)
      expect(res.statusCode).toBe(400)
      expect($('h1.govuk-heading-l').text().trim()).toBe('You cannot continue with your claim')
      const link = $('h1.govuk-heading-l').nextAll('p.govuk-body').first().find('a.govuk-link')
      expect(link.attr('href')).toBe('https://www.gov.uk/guidance/farmers-how-to-apply-for-funding-to-improve-animal-health-and-welfare#timing-of-reviews-and-follow-ups')
      expect(link.text().trim()).toBe('You must have an approved review claim for the different herd or flock, before you can claim for a follow-up.')
      // expect(raiseInvalidDataEvent).toHaveBeenCalled()
    })

    test('does call removeSessionDataForSameHerdChange when herdSame answer changes', async () => {
      getSessionData.mockReturnValue({
        reference: 'TEMP-6GSE-PIR8',
        typeOfReview: 'REVIEW',
        typeOfLivestock: 'sheep',
        previousClaims: [
          { createdAt: '2025-04-28T00:00:00.000Z', data: { claimType: 'R', typeOfLivestock: 'sheep', dateOfVisit: '2024-01-01T00:00:00.000Z' } }
        ],
        herdSame: 'yes'
      })

      const payload = { crumb, herdSame: 'no' }
      const res = await server.inject({ method: 'POST', url, auth, payload, headers: { cookie: `crumb=${crumb}` } })

      expect(res.statusCode).toBe(302)
      expect(removeSessionDataForSameHerdChange).toHaveBeenCalledTimes(1)
    })

    test('does NOT call removeSessionDataForSameHerdChange when herdSame answer stays the same', async () => {
      getSessionData.mockReturnValue({
        reference: 'TEMP-6GSE-PIR8',
        typeOfReview: 'REVIEW',
        typeOfLivestock: 'sheep',
        previousClaims: [
          { createdAt: '2025-04-28T00:00:00.000Z', data: { claimType: 'R', typeOfLivestock: 'sheep', dateOfVisit: '2024-01-01T00:00:00.000Z' } }
        ],
        herdSame: 'yes'
      })

      const payload = { crumb, herdSame: 'yes' }
      const res = await server.inject({ method: 'POST', url, auth, payload, headers: { cookie: `crumb=${crumb}` } })

      expect(res.statusCode).toBe(302)
      expect(removeSessionDataForSameHerdChange).toHaveBeenCalledTimes(0)
    })
  })
})

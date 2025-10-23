import * as cheerio from 'cheerio'
import { createServer } from '../../../../../app/server.js'
import { getCrumbs } from '../../../../utils/get-crumbs.js'
import expectPhaseBanner from 'assert'
import { getSessionData, setSessionData } from '../../../../../app/session/index.js'


jest.mock('../../../../../app/session/index.js')
// jest.mock('../../../../../app/event/send-herd-event.js', () => ({
//   sendHerdEvent: jest.fn()
// }))

describe('/herd-others-on-sbi tests', () => {
  const url = `/herd-others-on-sbi`
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
    test('returns 200 with herd labels when species beef', async () => {
      getSessionData.mockReturnValue({
        reference: 'TEMP-6GSE-PIR8',
        typeOfReview: 'REVIEW',
        typeOfLivestock: 'beef'
      })

      const res = await server.inject({ method: 'GET', url, auth })

      expect(res.statusCode).toBe(200)
      const $ = cheerio.load(res.payload)
      expect($('title').text().trim()).toContain('Is this the only beef cattle herd associated with this Single Business Identifier (SBI)? - Get funding to improve animal health and welfare - GOV.UKGOV.UK')
      expect($('.govuk-back-link').attr('href')).toContain('/enter-cph-number')
      expect($('.govuk-hint').text()).toContain('Tell us about this herd')
      const legend = $('.govuk-fieldset__legend--l')
      expect(legend.text().trim()).toBe(
        'Is this the only beef cattle herd associated with this Single Business Identifier (SBI)?'
      )
      expectPhaseBanner.ok($)
    })

    test('returns 200 with herd labels when species beef, also selects no', async () => {
      getSessionData.mockReturnValue({
        reference: 'TEMP-6GSE-PIR8',
        typeOfReview: 'REVIEW',
        typeOfLivestock: 'beef',
        isOnlyHerdOnSbi: 'no'
      })

      const res = await server.inject({ method: 'GET', url, auth })

      expect(res.statusCode).toBe(200)
      const $ = cheerio.load(res.payload)
      expect($('title').text().trim()).toContain('Is this the only beef cattle herd associated with this Single Business Identifier (SBI)? - Get funding to improve animal health and welfare - GOV.UKGOV.UK')
      expect($('.govuk-back-link').attr('href')).toContain('/enter-cph-number')
      expect($('.govuk-radios__input[value="no"]').is(':checked')).toBeTruthy()
      expectPhaseBanner.ok($)
    })

    test('returns 200 with flock labels when species sheep', async () => {
      getSessionData.mockReturnValue({
        reference: 'TEMP-6GSE-PIR8',
        typeOfReview: 'REVIEW',
        typeOfLivestock: 'sheep'
      })

      const res = await server.inject({ method: 'GET', url, auth })

      expect(res.statusCode).toBe(200)
      const $ = cheerio.load(res.payload)
      expect($('title').text().trim()).toContain('Is this the only flock of sheep associated with this Single Business Identifier (SBI)? - Get funding to improve animal health and welfare - GOV.UKGOV.UK')
      expect($('.govuk-back-link').attr('href')).toContain('/enter-cph-number')
      expect($('.govuk-hint').text()).toContain('Tell us about this flock')
      const legend = $('.govuk-fieldset__legend--l')
      expect(legend.text().trim()).toBe(
        'Is this the only flock of sheep associated with this Single Business Identifier (SBI)?'
      )
      expectPhaseBanner.ok($)
    })

    test('returns 200 with flock labels when species dairy', async () => {
      getSessionData.mockReturnValue({
        reference: 'TEMP-6GSE-PIR8',
        typeOfReview: 'REVIEW',
        typeOfLivestock: 'dairy'
      })

      const res = await server.inject({ method: 'GET', url, auth })

      expect(res.statusCode).toBe(200)
      const $ = cheerio.load(res.payload)
      expect($('title').text().trim()).toContain('Is this the only dairy cattle herd associated with this Single Business Identifier (SBI)? - Get funding to improve animal health and welfare - GOV.UKGOV.UK')
      expect($('.govuk-back-link').attr('href')).toContain('/enter-cph-number')
      expect($('.govuk-hint').text()).toContain('Tell us about this herd')
      const legend = $('.govuk-fieldset__legend--l')
      expect(legend.text().trim()).toBe(
        'Is this the only dairy cattle herd associated with this Single Business Identifier (SBI)?'
      )
      expectPhaseBanner.ok($)
    })

    test('returns 200 with flock labels when species pigs', async () => {
      getSessionData.mockReturnValue({
        reference: 'TEMP-6GSE-PIR8',
        typeOfReview: 'REVIEW',
        typeOfLivestock: 'pigs'
      })

      const res = await server.inject({ method: 'GET', url, auth })

      expect(res.statusCode).toBe(200)
      const $ = cheerio.load(res.payload)
      expect($('title').text().trim()).toContain('Is this the only pigs herd associated with this Single Business Identifier (SBI)? - Get funding to improve animal health and welfare - GOV.UKGOV.UK')
      expect($('.govuk-back-link').attr('href')).toContain('/enter-cph-number')
      expect($('.govuk-hint').text()).toContain('Tell us about this herd')
      const legend = $('.govuk-fieldset__legend--l')
      expect(legend.text().trim()).toBe(
        'Is this the only pigs herd associated with this Single Business Identifier (SBI)?'
      )
      expectPhaseBanner.ok($)
    })
  })

  describe('POST', () => {
    beforeAll(async () => {
      crumb = await getCrumbs(server)
    })

    test('navigates to enter herd details when no existing herd and they select yes', async () => {
      getSessionData.mockReturnValue({
        reference: 'TEMP-6GSE-PIR8',
        typeOfReview: 'REVIEW',
        typeOfLivestock: 'sheep'
      })

      const res = await server.inject({ method: 'POST', url, auth, payload: { crumb, isOnlyHerdOnSbi: 'yes' }, headers: { cookie: `crumb=${crumb}` } })

      expect(res.statusCode).toBe(302)
      expect(res.headers.location).toEqual('/check-herd-details')
      expect(setSessionData).toHaveBeenCalledTimes(2)
      expect(setSessionData).toHaveBeenCalledWith(expect.any(Object), 'endemicsClaim', 'isOnlyHerdOnSbi', 'yes')
      expect(setSessionData).toHaveBeenCalledWith(expect.any(Object), 'endemicsClaim','herdReasons', ['onlyHerd'])
      // expect(sendHerdEvent).toHaveBeenCalled()
    })

    test('navigates to check herd details when no existing herd and they select no', async () => {
      getSessionData.mockReturnValue({
        reference: 'TEMP-6GSE-PIR8',
        typeOfReview: 'REVIEW',
        typeOfLivestock: 'sheep'
      })

      const res = await server.inject({ method: 'POST', url, auth, payload: { crumb, isOnlyHerdOnSbi: 'no' }, headers: { cookie: `crumb=${crumb}` } })

      expect(res.statusCode).toBe(302)
      expect(res.headers.location).toEqual('/enter-herd-details')
      expect(setSessionData).toHaveBeenCalledTimes(1)
      expect(setSessionData).toHaveBeenCalledWith(expect.any(Object), 'endemicsClaim', 'isOnlyHerdOnSbi', 'no')
      // expect(sendHerdEvent).not.toHaveBeenCalled()
    })

    test('display errors with flock labels when no answer selected and typeOfLivestock is sheep', async () => {
      getSessionData.mockReturnValue({
        reference: 'TEMP-6GSE-PIR8',
        typeOfReview: 'REVIEW',
        typeOfLivestock: 'sheep'
      })

      const res = await server.inject({ method: 'POST', url, auth, payload: { crumb }, headers: { cookie: `crumb=${crumb}` } })

      const $ = cheerio.load(res.payload)
      expect(res.statusCode).toBe(400)
      expect($('h2.govuk-error-summary__title').text()).toContain('There is a problem')
      expect($('a[href="#isOnlyHerdOnSbi"]').text()).toContain('Select yes if this is the only flock of sheep associated with this SBI')
      expect($('title').text().trim()).toContain('Is this the only flock of sheep associated with this Single Business Identifier (SBI)? - Get funding to improve animal health and welfare - GOV.UKGOV.UK')
      expect($('.govuk-hint').text()).toContain('Tell us about this flock')
    })

    test('display errors with herd labels when no answer selected and typeOfLivestock is not sheep', async () => {
      getSessionData.mockReturnValue({
        reference: 'TEMP-6GSE-PIR8',
        typeOfReview: 'REVIEW',
        typeOfLivestock: 'beef'
      })

      const res = await server.inject({ method: 'POST', url, auth, payload: { crumb }, headers: { cookie: `crumb=${crumb}` } })

      const $ = cheerio.load(res.payload)
      expect(res.statusCode).toBe(400)
      expect($('h2.govuk-error-summary__title').text()).toContain('There is a problem')
      expect($('a[href="#isOnlyHerdOnSbi"]').text()).toContain('Select yes if this is the only beef cattle herd associated with this SBI')
      expect($('title').text().trim()).toContain('Is this the only beef cattle herd associated with this Single Business Identifier (SBI)? - Get funding to improve animal health and welfare - GOV.UKGOV.UK')
      expect($('.govuk-hint').text()).toContain('Tell us about this herd')
    })
  })
})

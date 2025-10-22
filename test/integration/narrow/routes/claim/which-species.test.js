import * as cheerio from 'cheerio'
import { createServer } from '../../../../../app/server.js'
import { getCrumbs } from '../../../../utils/get-crumbs.js'
import { resetEndemicsClaimSession, refreshApplications } from '../../../../../app/lib/context-helper.js'
import { getSessionData, setSessionData } from "../../../../../app/session/index.js";

jest.mock('../../../../../app/session')
jest.mock('../../../../../app/lib/context-helper', () => ({
  resetEndemicsClaimSession: jest.fn(),
  refreshApplications: jest.fn().mockResolvedValue({ latestEndemicsApplication: { reference: 'ABC123' } })
}))

describe('Endemics which species test', () => {
  setSessionData.mockImplementation(() => { })
  const url = `/which-species`
  const auth = {
    credentials: { reference: '1111', sbi: '111111111' },
    strategy: 'cookie'
  }
  let crumb
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  beforeEach(async () => {
    crumb = await getCrumbs(server)
  })

  describe('GET /which-species', () => {
    test('should render page when no previous session exists', async () => {
      const options = {
        method: 'GET',
        auth,
        url
      }
      getSessionData.mockReturnValue({ reference: 'TEMP-6GSE-PIR8', organisation: { sbi: 123456789 } })

      const res = await server.inject(options)
      const $ = cheerio.load(res.payload)

      expect(res.statusCode).toBe(200)
      expect($('title').text().trim()).toContain('Which species are you claiming for? - Get funding to improve animal health and welfare - GOV.UK')
      expect($('h1').text().trim()).toMatch('Which species are you claiming for?')
      expect($('.govuk-radios__item').length).toEqual(4)
      expect($('.govuk-back-link').attr('href')).toContain('vet-visits')

      expect(resetEndemicsClaimSession).toHaveBeenCalled()
      expect(refreshApplications).toHaveBeenCalled()
    })
  })

  test.each([
    { typeOfLivestock: 'beef', radio: 'Beef cattle' },
    { typeOfLivestock: 'dairy', radio: 'Dairy cattle' },
    { typeOfLivestock: 'pigs', radio: 'Pigs' },
    { typeOfLivestock: 'sheep', radio: 'Sheep' }
  ])('should select $radio when previous session livestock is $typeOfLivestock', async ({ typeOfLivestock, radio }) => {
    const options = {
      method: 'GET',
      auth,
      url
    }

    getSessionData.mockReturnValue({ typeOfLivestock, reference: 'TEMP-6GSE-PIR8', organisation: { id: 42 } })

    const res = await server.inject(options)

    const $ = cheerio.load(res.payload)
    expect($('input[name="typeOfLivestock"]:checked').next('label').text().trim()).toEqual(radio)
    expect($('.govuk-back-link').text()).toMatch('Back')
  })

  describe('POST claim/endemics/which-species', () => {
    test('should display error when livestock not selected', async () => {
      const options = {
        method: 'POST',
        auth,
        url,
        headers: { cookie: `crumb=${crumb}` },
        payload: { crumb, typeOfLivestock: '' }
      }
      getSessionData.mockReturnValue({})

      const res = await server.inject(options)

      const $ = cheerio.load(res.payload)
      expect($('p.govuk-error-message').text()).toMatch('Select which species you are claiming for')
      expect(res.statusCode).toBe(400)
    })

    test('should redirect to next page when livestock selected', async () => {
      const options = {
        method: 'POST',
        auth,
        url,
        headers: { cookie: `crumb=${crumb}` },
        payload: { crumb, typeOfLivestock: 'sheep' }
      }
      getSessionData.mockReturnValue({ typeOfLivestock: 'sheep', latestEndemicsApplication: { reference: 'TEMP-6GSE-PIR8' } })

      const res = await server.inject(options)

      expect(res.statusCode).toBe(302)
      expect(res.headers.location).toEqual('/which-type-of-review')
      expect(setSessionData).toHaveBeenCalled()
    })

    test('should redirect to next page when livestock selected has changed from previous session', async () => {
      const options = {
        method: 'POST',
        auth,
        url,
        headers: { cookie: `crumb=${crumb}` },
        payload: { crumb, typeOfLivestock: 'sheep' }
      }
      getSessionData.mockReturnValue({ typeOfLivestock: 'beef', reference: 'TEMP-6GSE-PIR8', latestEndemicsApplication: { reference: 'AHWR-2470-6BA9' } })

      const res = await server.inject(options)

      expect(res.statusCode).toBe(302)
      expect(res.headers.location).toEqual('/which-type-of-review')
      expect(setSessionData).toHaveBeenCalled()
      expect(resetEndemicsClaimSession).toHaveBeenCalledWith(expect.any(Object), 'AHWR-2470-6BA9', 'TEMP-6GSE-PIR8')
    })
  })
})

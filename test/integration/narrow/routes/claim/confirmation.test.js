import * as cheerio from 'cheerio'
import { createServer } from '../../../../../app/server.js'
import { getReviewType } from "../../../../../app/lib/utils.js";
import { getSessionData } from "../../../../../app/session/index.js";

jest.mock('../../../../../app/session')

describe('Claim confirmation', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop()
  })

  const reference = 'TBD-F021-723B'
  const auth = { credentials: {}, strategy: 'cookie' }
  const url = `/confirmation`

  test.each([
    { typeOfLivestock: 'beef', typeOfReview: 'FOLLOW_UP' },
    { typeOfLivestock: 'pigs', typeOfReview: 'FOLLOW_UP' },
    { typeOfLivestock: 'dairy', typeOfReview: 'FOLLOW_UP' },
    { typeOfLivestock: 'sheep', typeOfReview: 'FOLLOW_UP' },
    { typeOfLivestock: 'beef', typeOfReview: 'REVIEW' },
    { typeOfLivestock: 'pigs', typeOfReview: 'REVIEW' },
    { typeOfLivestock: 'dairy', typeOfReview: 'REVIEW' },
    { typeOfLivestock: 'sheep', typeOfReview: 'REVIEW' }
  ])('GET endemicsConfirmation route', async ({ typeOfReview }) => {
    const { isReview } = getReviewType(typeOfReview)
    const options = {
      method: 'GET',
      url,
      auth
    }

    getSessionData.mockImplementation(() => {
      return {
        reference,
        amount: 55,
        typeOfReview
      }
    })
    const res = await server.inject(options)

    const $ = cheerio.load(res.payload)

    expect(res.statusCode).toBe(200)
    expect($('#amount').text()).toContain('55')
    expect($('#reference').text().trim()).toEqual(reference)
    expect($('#message').text().trim()).toContain(isReview ? 'animal health and welfare review' : 'endemic disease follow-up')
  })
})

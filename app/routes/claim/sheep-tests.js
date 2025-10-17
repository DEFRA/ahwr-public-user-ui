import links from '../../config/routes.js'
import { sessionKeys } from '../../session/keys.js'
import { getEndemicsClaim, setEndemicsClaim } from '../../session/index.js'
import { sheepTestTypes } from '../../constants/sheep-test-types.js'
import HttpStatus from 'http-status-codes'
import { prefixUrl } from '../utils/page-utils.js'

const { sheepTests: sheepTestsKey, sheepTestResults: sheepTestResultsKey } = sessionKeys.endemicsClaim
const { endemicsSheepEndemicsPackage, endemicsSheepTests, endemicsSheepTestResults } = links

const pageUrl = prefixUrl(endemicsSheepTests)
const backLink = prefixUrl(endemicsSheepEndemicsPackage)

const getHandler = {
  method: 'GET',
  path: pageUrl,
  options: {
    handler: async (request, h) => {
      const sessionEndemicsClaim = getEndemicsClaim(request)
      const sheepTestCheckboxItems = sheepTestTypes[sessionEndemicsClaim?.sheepEndemicsPackage].map((test) => ({ ...test, checked: sessionEndemicsClaim.sheepTests?.includes(test.value) }))

      return h.view(endemicsSheepTests, {
        sheepTestCheckboxItems,
        backLink
      })
    }
  }
}

const postHandler = {
  method: 'POST',
  path: pageUrl,
  options: {
    handler: async (request, h) => {
      const { sheepTests } = request.payload
      const session = getEndemicsClaim(request)
      setEndemicsClaim(request, sheepTestsKey, sheepTests)

      if (!sheepTests) {
        setEndemicsClaim(request, sheepTestResultsKey, undefined)
        const sheepTestCheckboxItems = sheepTestTypes[session?.sheepEndemicsPackage].map((test) => ({ ...test, checked: sheepTests?.includes(test.value) }))

        return h.view(endemicsSheepTests, {
          sheepTestCheckboxItems,
          backLink,
          errorMessage: {
            text: 'Select a disease or condition',
            href: '#sheepTests'
          }
        }).code(HttpStatus.BAD_REQUEST).takeover()
      }

      if (sheepTests === 'other') {
        const sheepTestCheckboxItems = sheepTestTypes[session?.sheepEndemicsPackage].map((test) => ({ ...test, checked: sheepTests?.includes(test.value) }))

        return h.view(endemicsSheepTests, {
          sheepTestCheckboxItems,
          backLink,
          errorMessage: {
            text: 'Select all diseases or conditions tested for in this package',
            href: '#sheepTests'
          }
        }).code(HttpStatus.BAD_REQUEST).takeover()
      }

      setEndemicsClaim(request, sheepTestResultsKey,
        [...(typeof sheepTests === 'object' ? sheepTests : [sheepTests])]
          .map((test, index) => ({ diseaseType: test, result: session?.sheepTestResults?.find(item => item.diseaseType === test)?.result || '', isCurrentPage: index === 0 })))
      return h.redirect(prefixUrl(endemicsSheepTestResults))
    }
  }
}

export const sheepTestsHandlers = [getHandler, postHandler]

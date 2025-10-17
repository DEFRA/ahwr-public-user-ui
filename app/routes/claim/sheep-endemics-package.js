import Joi from 'joi'
import links from '../../config/routes.js'
import { sessionKeys } from '../../session/keys.js'
import { getEndemicsClaim, setEndemicsClaim } from '../../session/index.js'
import { radios } from '../models/form-component/radios.js'
import HttpStatus from 'http-status-codes'
import { prefixUrl } from '../utils/page-utils.js'

const { endemicsSheepEndemicsPackage, endemicsVetRCVS, endemicsSheepTests } = links
const { endemicsClaim: { sheepEndemicsPackage: sheepEndemicsPackageKey } } = sessionKeys
const pageUrl = prefixUrl(endemicsSheepEndemicsPackage)
const options = {
  hintHtml: 'You can find this on the summary the vet gave you. The diseases the vet might take samples to test for are listed with each package.'
}
const pageHeading = 'Which sheep health package did you choose?'

const sheepRadioOptions = [{
  value: 'improvedEwePerformance',
  text: 'Ewe condition',
  hint: {
    text: 'Includes: Johne’s, Maedi Visna (MV), Caseous lymphadenitis (CLA), Ovine pulmonary adenocarcinoma (OPA), trace elements, liver fluke, aemonchosis, ewe nutrition status, mastitis, tick-borne fever, louping ill, orf, pulpy kidney'
  }
},
{
  value: 'improvedReproductivePerformance',
  text: 'Reproductive performance',
  hint: {
    text: 'Includes: enzootic abortion of ewes (EAE), border disease (BD), toxoplasmosis, ewe nutrition status, trace elements, liver fluke, tick-borne fever'
  }
},
{
  value: 'improvedLambPerformance',
  text: 'Lamb performance',
  hint: {
    text: 'Includes: border disease (BD), trace elements, liver fluke, parasitic gastroenteritis (PGE), coccidiosis, mastitis, tick-borne fever, louping ill, tick pyaemia, lamb nutrition status, orf, pulpy kidney, lamb dysentery, pasteurellosis'
  }
},
{
  value: 'improvedNeonatalLambSurvival',
  text: 'Neonatal lamb survival',
  hint: {
    text: 'Includes: border disease (BD), toxoplasmosis, joint ill, ewe nutrition status, trace elements, watery mouth, mastitis, tick pyaemia, lamb dysentery, pasteurellosis'
  }
},
{
  value: 'reducedExternalParasites',
  text: 'External parasites',
  hint: {
    text: 'Includes: flystrike, sheep scab'
  }
},
{
  value: 'reducedLameness',
  text: 'Lameness',
  hint: {
    text: 'Includes: joint ill, lameness, foot rot, scald, contagious ovine digital dermatitis (CODD), granuloma, heel or toe abscess, shelly hoof, tick pyaemia'
  }
}]

const getHandler = {
  method: 'GET',
  path: pageUrl,
  options: {
    handler: async (request, h) => {
      const session = getEndemicsClaim(request)
      const sheepEndemicsPackageRadios = radios(pageHeading, 'sheepEndemicsPackage', undefined, options)(
        sheepRadioOptions.map((option) => ({
          ...option,
          checked: session?.sheepEndemicsPackage === option.value
        })))
      const backLink = prefixUrl(endemicsVetRCVS)
      return h.view(endemicsSheepEndemicsPackage, { backLink, pageHeading, sheepEndemicsPackage: session?.sheepEndemicsPackage, ...sheepEndemicsPackageRadios })
    }
  }
}

const postHandler = {
  method: 'POST',
  path: pageUrl,
  options: {
    validate: {
      payload: Joi.object({
        sheepEndemicsPackage: Joi.string().valid(
          'improvedEwePerformance',
          'improvedReproductivePerformance',
          'improvedLambPerformance',
          'improvedNeonatalLambSurvival',
          'reducedExternalParasites',
          'reducedLameness').required()
      }),
      failAction: async (request, h, err) => {
        request.logger.setBindings({ err })
        const sheepEndemicsPackageRadios = radios(pageHeading, 'sheepEndemicsPackage', 'Select a sheep health package', options)(sheepRadioOptions)
        const backLink = prefixUrl(endemicsVetRCVS)
        return h.view(endemicsSheepEndemicsPackage, {
          ...request.payload,
          backLink,
          pageHeading,
          ...sheepEndemicsPackageRadios,
          errorMessage: {
            text: 'Select a sheep health package',
            href: '#sheepEndemicsPackage'
          }
        }).code(HttpStatus.BAD_REQUEST).takeover()
      }
    },
    handler: async (request, h) => {
      const { sheepEndemicsPackage } = request.payload
      const session = getEndemicsClaim(request)
      if (session?.sheepEndemicsPackage !== sheepEndemicsPackage) {
        setEndemicsClaim(request, 'sheepTests', undefined)
        setEndemicsClaim(request, 'sheepTestResults', undefined)
      }

      setEndemicsClaim(request, sheepEndemicsPackageKey, sheepEndemicsPackage)

      return h.redirect(prefixUrl(endemicsSheepTests))
    }
  }
}

export const sheepEndemicsPackageHandlers = [getHandler, postHandler]

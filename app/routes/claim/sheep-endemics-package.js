import Joi from 'joi'
import { radios } from '../models/form-component/radios.js'
import HttpStatus from 'http-status-codes'
import { claimRoutes, claimViews } from "../../constants/routes.js";
import { getSessionData, sessionEntryKeys, sessionKeys, setSessionData } from "../../session/index.js";

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
  path: claimRoutes.sheepEndemicsPackage,
  options: {
    handler: async (request, h) => {
      const session = getSessionData(request, sessionEntryKeys.endemicsClaim);
      const sheepEndemicsPackageRadios = radios(pageHeading, 'sheepEndemicsPackage', undefined, options)(
        sheepRadioOptions.map((option) => ({
          ...option,
          checked: session.sheepEndemicsPackage === option.value
        })))
      const backLink = claimRoutes.vetRcvs
      return h.view(claimViews.sheepEndemicsPackage, { backLink, pageHeading, sheepEndemicsPackage: session.sheepEndemicsPackage, ...sheepEndemicsPackageRadios })
    }
  }
}

const postHandler = {
  method: 'POST',
  path: claimRoutes.sheepEndemicsPackage,
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

        return h.view(claimViews.sheepEndemicsPackage, {
          ...request.payload,
          backLink: claimRoutes.vetRcvs,
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
      const session = getSessionData(request, sessionEntryKeys.endemicsClaim);
      if (session.sheepEndemicsPackage !== sheepEndemicsPackage) {
        setSessionData(request, sessionEntryKeys.endemicsClaim, sessionKeys.endemicsClaim.sheepTests, undefined)
        setSessionData(request, sessionEntryKeys.endemicsClaim, sessionKeys.endemicsClaim.sheepTestResults, undefined)
        // TODO : These two previous emitted events on change
      }
      // TODO: and this
      setSessionData(request, sessionEntryKeys.endemicsClaim, sessionKeys.endemicsClaim.sheepEndemicsPackage, sheepEndemicsPackage)

      return h.redirect(claimRoutes.sheepTests)
    }
  }
}

export const sheepEndemicsPackageHandlers = [getHandler, postHandler]

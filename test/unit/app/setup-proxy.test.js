import { getGlobalDispatcher, ProxyAgent } from 'undici'

import { config } from '../../../app/config/index.js'
import { setupProxy } from "../../../app/lib/setup-proxy.js";

describe('setupProxy', () => {
  afterEach(() => {
    config.proxy = null
  })

  test('Should not setup proxy if the environment variable is not set', () => {
    config.proxy = null
    setupProxy()

    expect(global?.GLOBAL_AGENT?.HTTP_PROXY).toBeUndefined()

    const undiciDispatcher = getGlobalDispatcher()

    expect(undiciDispatcher).not.toBeInstanceOf(ProxyAgent)
  })

  test('Should setup proxy if the environment variable is set', () => {
    config.proxy = 'http://localhost:8080'
    setupProxy()
    expect(global?.GLOBAL_AGENT?.HTTP_PROXY).toBe('http://localhost:8080')
    const undiciDispatcher = getGlobalDispatcher()
    expect(undiciDispatcher).toBeInstanceOf(ProxyAgent)
  })
})

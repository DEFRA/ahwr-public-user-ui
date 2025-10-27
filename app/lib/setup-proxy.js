import { ProxyAgent, setGlobalDispatcher } from 'undici'
import { bootstrap } from 'global-agent'

import { config } from '../config/index.js'

/**
 * If HTTP_PROXY is set setupProxy() will enable it globally
 * for a number of http clients.
 * Node Fetch will still need to pass a ProxyAgent in on each call.
 */
export function setupProxy() {
  const proxyUrl = config.proxy

  if (proxyUrl) {
    console.log('setting up global proxies') // TODO replace with logger

    // Undici proxy
    setGlobalDispatcher(new ProxyAgent(proxyUrl))

    // global-agent (axios/request/and others)
    bootstrap()
    global.GLOBAL_AGENT.HTTP_PROXY = proxyUrl
  }
}

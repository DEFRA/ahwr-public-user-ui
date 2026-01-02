import { ProxyAgent, setGlobalDispatcher } from "undici";
import { bootstrap } from "global-agent";

import { config } from "../config/index.js";
import { getLogger } from "../logging/logger.js";

/**
 * If HTTP_PROXY is set setupProxy() will enable it globally
 * for a number of http clients.
 * Node Fetch will still need to pass a ProxyAgent in on each call.
 */
export function setupProxy() {
  const proxyUrl = config.proxy;

  if (proxyUrl) {
    getLogger().info("Setting up global proxies");

    // Undici proxy
    setGlobalDispatcher(new ProxyAgent(proxyUrl));

    // global-agent (axios/request/and others)
    bootstrap();
    globalThis.GLOBAL_AGENT.HTTP_PROXY = proxyUrl;
  }
}

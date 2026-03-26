import type { SiteImageConfig } from './content-types';
import type { DeferredMountBootstrapOptions } from './deferred-mount-bootstrap';
import { resolveDeferredMountRuntimeConfig } from './page-load-orchestrator';

export function buildDeferredMountRuntimePayload(
  lazyLoad: SiteImageConfig['lazyLoad'],
  isDev: boolean,
): string {
  const runtimeConfig = resolveDeferredMountRuntimeConfig(lazyLoad, isDev);
  return JSON.stringify(runtimeConfig);
}

export function buildDeferredMountBootstrapOptions(
  containerSelector: string,
  configDataKey: string,
  mountGroup: string,
): DeferredMountBootstrapOptions {
  return {
    containerSelector,
    configDataKey,
    mountGroup,
  };
}

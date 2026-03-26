import { buildDeferredMountGroupSelector } from './deferred-mount-contract';
import { initDeferredMounts } from './deferred-mount-runtime';
import { assertString } from './assertions';

export interface DeferredMountBootstrapOptions {
  containerSelector: string;
  configDataKey: string;
  mountGroup: string;
}

interface DeferredMountBootstrapConfig {
  rootMargin: string;
  mountDelayMs: number;
}

function parseBootstrapConfig(serializedConfig: string): DeferredMountBootstrapConfig {
  const rawConfig = JSON.parse(serializedConfig);
  const rootMargin = assertString(rawConfig?.rootMargin, 'deferred mount bootstrap rootMargin');

  if (typeof rawConfig?.mountDelayMs !== 'number' || rawConfig.mountDelayMs < 0) {
    throw new Error('Invalid deferred mount bootstrap mountDelayMs.');
  }

  return {
    rootMargin,
    mountDelayMs: rawConfig.mountDelayMs,
  };
}

export function bootstrapDeferredMounts(options: DeferredMountBootstrapOptions): void {
  const containerSelector = assertString(options.containerSelector, 'deferred mount bootstrap containerSelector');
  const configDataKey = assertString(options.configDataKey, 'deferred mount bootstrap configDataKey');
  const mountGroup = assertString(options.mountGroup, 'deferred mount bootstrap mountGroup');

  const container = document.querySelector(containerSelector);
  if (!(container instanceof HTMLElement)) {
    return;
  }

  const serializedConfig = container.dataset[configDataKey];
  if (!serializedConfig) {
    throw new Error('Missing deferred mount runtime config payload.');
  }

  const runtimeConfig = parseBootstrapConfig(serializedConfig);
  initDeferredMounts({
    selector: buildDeferredMountGroupSelector(mountGroup),
    rootMargin: runtimeConfig.rootMargin,
    mountDelayMs: runtimeConfig.mountDelayMs,
  });
}

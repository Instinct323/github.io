export const PAGE_LOAD_PRIORITY = ['frame', 'background', 'controls'] as const;

export type PageLoadStage = (typeof PAGE_LOAD_PRIORITY)[number];

type MaybePromise<T> = T | Promise<T>;

export interface PageLoadContext<TFrame, TBackground> {
  frame: TFrame;
  background: TBackground;
}

export interface PageLoadPlan<TFrame, TBackground, TControls> {
  frame: () => MaybePromise<TFrame>;
  background?: (_ctx: Pick<PageLoadContext<TFrame, TBackground>, 'frame'>) => MaybePromise<TBackground>;
  controls?: (_ctx: PageLoadContext<TFrame, TBackground>) => MaybePromise<TControls>;
}

export interface PageLoadResult<TFrame, TBackground, TControls> {
  frame: TFrame;
  background: TBackground;
  controls: TControls;
}

export type ControlImagePriority = 'critical' | 'deferred';

export interface ControlImageLoadingAttrs {
  loading: 'eager' | 'lazy';
  decoding: 'sync' | 'async';
  fetchPriority: 'high' | 'auto';
}

export interface DeferredImageLazyLoadConfig {
  rootMargin: string;
  localDebugDelayMs: number;
}

export interface DeferredMountRuntimeConfig {
  rootMargin: string;
  mountDelayMs: number;
}

export function resolveControlImageLoading(priority: ControlImagePriority): ControlImageLoadingAttrs {
  if (priority === 'critical') {
    return {
      loading: 'eager',
      decoding: 'sync',
      fetchPriority: 'high',
    };
  }

  return {
    loading: 'lazy',
    decoding: 'async',
    fetchPriority: 'auto',
  };
}

export function resolveDeferredMountRuntimeConfig(
  lazyLoad: DeferredImageLazyLoadConfig,
  isDev: boolean,
): DeferredMountRuntimeConfig {
  return {
    rootMargin: lazyLoad.rootMargin,
    mountDelayMs: isDev ? lazyLoad.localDebugDelayMs : 0,
  };
}

export async function orchestratePageLoad<TFrame, TBackground = null, TControls = null>(
  plan: PageLoadPlan<TFrame, TBackground, TControls>,
): Promise<PageLoadResult<TFrame, TBackground, TControls>> {
  const frame = await plan.frame();
  const background = plan.background ? await plan.background({ frame }) : null;
  const controls = plan.controls
    ? await plan.controls({ frame, background: background as TBackground })
    : null;

  return {
    frame,
    background: background as TBackground,
    controls: controls as TControls,
  };
}

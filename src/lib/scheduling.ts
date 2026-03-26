export interface IdleScheduleOptions {
  timeout: number;
  fallbackDelayMs: number;
}

const DEFAULT_IDLE_SCHEDULE_OPTIONS: IdleScheduleOptions = {
  timeout: 1000,
  fallbackDelayMs: 150,
};

export function runWhenIdle(
  callback: () => void,
  options: Partial<IdleScheduleOptions> = {},
): void {
  const { timeout, fallbackDelayMs } = {
    ...DEFAULT_IDLE_SCHEDULE_OPTIONS,
    ...options,
  };

  try {
    window.requestIdleCallback(() => {
      callback();
    }, { timeout });
  } catch {
    window.setTimeout(() => {
      callback();
    }, fallbackDelayMs);
  }
}

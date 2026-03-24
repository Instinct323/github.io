import type { SitePageKey } from './content-types';

export type ShellVariant = 'default' | 'home' | 'about' | 'photography';
export type OverlayVariant = 'hero' | 'soft' | 'gallery';
export type ContentWidth = 'compact' | 'standard' | 'wide';

export interface LayoutProps {
  pageKey?: SitePageKey;
  title?: string;
  description?: string;
  type?: 'website' | 'article';
  noindex?: boolean;
  shell?: ShellVariant;
  overlayVariant?: OverlayVariant;
  contentWidth?: ContentWidth | string;
}

interface ShellTokenConfig {
  overlayAccentPrimary: string;
  overlayAccentSecondary: string;
  surfaceBg: string;
  cardSurfaceBg: string;
  surfaceBorder: string;
  pageCanvas: string;
  textStrong: string;
  textBody: string;
  textMuted: string;
}

const ELEVATED_SHELL_TOKENS: ShellTokenConfig = {
  overlayAccentPrimary: 'var(--shell-hero-accent-primary)',
  overlayAccentSecondary: 'var(--shell-hero-accent-secondary)',
  surfaceBg: 'var(--shell-elevated-surface-bg)',
  cardSurfaceBg: 'var(--shell-elevated-card-bg)',
  surfaceBorder: 'var(--shell-elevated-surface-border)',
  pageCanvas: 'var(--shell-elevated-canvas)',
  textStrong: 'var(--shell-home-text-strong)',
  textBody: 'var(--shell-home-text-body)',
  textMuted: 'var(--shell-home-text-muted)',
};

const SHELL_OVERLAY_DEFAULTS: Record<ShellVariant, OverlayVariant> = {
  default: 'soft',
  home: 'hero',
  about: 'hero',
  photography: 'hero',
};

const shellTokens: Partial<Record<ShellVariant, ShellTokenConfig>> = {
  home: ELEVATED_SHELL_TOKENS,
  about: ELEVATED_SHELL_TOKENS,
  photography: {
    ...ELEVATED_SHELL_TOKENS,
    textStrong: 'var(--shell-text-strong-photography)',
    textBody: 'var(--shell-text-body-photography)',
    textMuted: 'var(--shell-text-muted-photography)',
  },
};

const overlayTokens: Record<OverlayVariant, string> = {
  hero: 'var(--overlay-hero)',
  soft: 'var(--overlay-soft)',
  gallery: 'var(--overlay-gallery)',
};

const contentWidthTokens: Record<ContentWidth, string> = {
  compact: 'var(--page-width-compact)',
  standard: 'var(--page-width-standard)',
  wide: 'var(--page-width-wide)',
};

function resolveContentWidth(contentWidth: ContentWidth | string): string {
  if (contentWidth in contentWidthTokens) {
    return contentWidthTokens[contentWidth as ContentWidth];
  }

  return contentWidth;
}

export function buildShellStyle(
  shell: ShellVariant,
  overlayVariant: OverlayVariant | undefined,
  contentWidth: ContentWidth | string,
  backgroundMobileImage: string,
  backgroundDesktopImage: string
): string {
  const shellConfig = shellTokens[shell];
  const shellOverlayVariant = overlayVariant ?? SHELL_OVERLAY_DEFAULTS[shell];
  const pageOverlay = overlayTokens[shellOverlayVariant];
  const layoutContentWidth = resolveContentWidth(contentWidth);

  const shellStyleTokens: Record<string, string> = {
    '--page-bg-image-mobile': backgroundMobileImage,
    '--page-bg-image-desktop': backgroundDesktopImage,
    '--page-overlay': pageOverlay,
    '--layout-content-width': layoutContentWidth,
  };

  if (shellConfig) {
    Object.assign(shellStyleTokens, {
      '--page-overlay-accent-primary': shellConfig.overlayAccentPrimary,
      '--page-overlay-accent-secondary': shellConfig.overlayAccentSecondary,
      '--surface-bg': shellConfig.surfaceBg,
      '--card-surface-bg': shellConfig.cardSurfaceBg,
      '--surface-border': shellConfig.surfaceBorder,
      '--page-canvas': shellConfig.pageCanvas,
      '--text-strong': shellConfig.textStrong,
      '--text-body': shellConfig.textBody,
      '--text-muted': shellConfig.textMuted,
    });
  }

  return Object.entries(shellStyleTokens)
    .map(([name, value]) => `${name}: ${value}`)
    .join('; ');
}

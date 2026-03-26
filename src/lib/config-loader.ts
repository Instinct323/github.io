import introductionRaw from '../../content/config/introduction.md?raw';
import profile from '../../content/config/profile.json';
import siteConfigRaw from '../../content/config/site.jsonc?raw';
import { parse } from 'jsonc-parser';
import { assertBoolean, assertFiniteNumber, assertObject, assertString } from './assertions';

import type {
  HomePageCarouselVisualConfig,
  HomePageConfigGroup,
  MediaConfig,
  NavigationConfig,
  PhotographyPageConfig,
  ProfileData,
  SiteEffectsConfig,
  SiteConfig,
  SiteImageConfig,
  SiteMetadata,
  StarfieldEffectConfig,
} from './content-types';
import {
  IMAGE_LOADING_EFFECT_NAMES,
  type ImageLoadingEffectName,
} from './image-loading-effect-registry';

const IMAGE_LOADING_EFFECT_NAME_SET = new Set<string>(IMAGE_LOADING_EFFECT_NAMES);

function isImageLoadingEffectName(value: string): value is ImageLoadingEffectName {
  return IMAGE_LOADING_EFFECT_NAME_SET.has(value);
}

function resolveFeaturedCarouselVisual(visual: unknown): HomePageCarouselVisualConfig {
  const source = visual && typeof visual === 'object' && !Array.isArray(visual)
    ? (visual as Partial<HomePageCarouselVisualConfig>)
    : {};

  const slideWidth = source.slideWidth;
  if (!slideWidth || typeof slideWidth !== 'object') {
    throw new Error('Missing carousel visual.slideWidth configuration');
  }

  const sw = slideWidth as Partial<HomePageCarouselVisualConfig['slideWidth']>;
  if (!sw.desktop || typeof sw.desktop !== 'string' || !sw.desktop.trim()) {
    throw new Error('Missing or invalid carousel visual.slideWidth.desktop');
  }
  if (!sw.tablet || typeof sw.tablet !== 'string' || !sw.tablet.trim()) {
    throw new Error('Missing or invalid carousel visual.slideWidth.tablet');
  }
  if (!sw.mobile || typeof sw.mobile !== 'string' || !sw.mobile.trim()) {
    throw new Error('Missing or invalid carousel visual.slideWidth.mobile');
  }

  const spaceBetween = assertFiniteNumber(source.spaceBetween, 'carousel visual.spaceBetween');
  if (spaceBetween < 0) {
    throw new Error('Missing or invalid carousel visual.spaceBetween (must be a non-negative number)');
  }

  const inactiveOpacityRaw = assertFiniteNumber(source.inactiveOpacity, 'carousel visual.inactiveOpacity');
  const inactiveOpacity = Math.min(1, Math.max(0, inactiveOpacityRaw));

  return {
    spaceBetween,
    slideWidth: {
      desktop: sw.desktop.trim(),
      tablet: sw.tablet.trim(),
      mobile: sw.mobile.trim(),
    },
    inactiveOpacity,
  };
}

function resolveStarfieldEffectConfig(config: unknown): StarfieldEffectConfig {
  const source = assertObject<Partial<StarfieldEffectConfig>>(config, 'effects.starfield');

  const starDensity = source.starDensity;
  if (!starDensity || !['low', 'medium', 'high', 'ultra'].includes(starDensity)) {
    throw new Error('Missing or invalid effects.starfield.starDensity (must be low/medium/high/ultra)');
  }

  const starSize = source.starSize;
  const starSizeConfig = assertObject<{ min: number; max: number }>(starSize, 'effects.starfield.starSize');
  const starSizeMin = assertFiniteNumber(starSizeConfig.min, 'effects.starfield.starSize.min');
  const starSizeMax = assertFiniteNumber(starSizeConfig.max, 'effects.starfield.starSize.max');
  if (starSizeMin <= 0 || starSizeMax <= 0 || starSizeMin > starSizeMax) {
    throw new Error('Missing or invalid effects.starfield.starSize range (0 < min <= max required)');
  }

  const speedFactor = assertFiniteNumber(source.speedFactor, 'effects.starfield.speedFactor');
  if (speedFactor < 0) {
    throw new Error('Missing or invalid effects.starfield.speedFactor (must be >= 0)');
  }

  const maxDistance = assertFiniteNumber(source.maxDistance, 'effects.starfield.maxDistance');
  if (maxDistance <= 0) {
    throw new Error('Missing or invalid effects.starfield.maxDistance (must be > 0)');
  }

  const linkOpacity = assertFiniteNumber(source.linkOpacity, 'effects.starfield.linkOpacity');
  const starOpacity = assertFiniteNumber(source.starOpacity, 'effects.starfield.starOpacity');
  if (linkOpacity < 0 || linkOpacity > 1 || starOpacity < 0 || starOpacity > 1) {
    throw new Error('Missing or invalid effects.starfield opacity values (must be within [0, 1])');
  }

  const starColor = assertString(source.starColor, 'effects.starfield.starColor');

  const starShapes = source.starShapes;
  if (!Array.isArray(starShapes) || starShapes.length === 0) {
    throw new Error('Missing or invalid effects.starfield.starShapes (must be non-empty array)');
  }
  if (!starShapes.every((shape) => shape === 'circle' || shape === 'star')) {
    throw new Error('Missing or invalid effects.starfield.starShapes (values must be circle/star)');
  }

  const parallaxEffect = assertBoolean(source.parallaxEffect, 'effects.starfield.parallaxEffect');
  const parallaxStrength = assertFiniteNumber(source.parallaxStrength, 'effects.starfield.parallaxStrength');
  if (parallaxStrength <= 0) {
    throw new Error('Missing or invalid effects.starfield.parallaxStrength (must be > 0)');
  }

  const mouseRadius = assertFiniteNumber(source.mouseRadius, 'effects.starfield.mouseRadius');
  if (mouseRadius < 0) {
    throw new Error('Missing or invalid effects.starfield.mouseRadius (must be >= 0)');
  }

  const rotationSpeed = source.rotationSpeed;
  const rotationSpeedConfig = assertObject<{ min: number; max: number }>(
    rotationSpeed,
    'effects.starfield.rotationSpeed',
  );
  const rotationSpeedMin = assertFiniteNumber(rotationSpeedConfig.min, 'effects.starfield.rotationSpeed.min');
  const rotationSpeedMax = assertFiniteNumber(rotationSpeedConfig.max, 'effects.starfield.rotationSpeed.max');
  if (rotationSpeedMin < 0 || rotationSpeedMax < 0 || rotationSpeedMin > rotationSpeedMax) {
    throw new Error('Missing or invalid effects.starfield.rotationSpeed range (0 <= min <= max required)');
  }

  const connectionsWhenNoMouse = assertBoolean(
    source.connectionsWhenNoMouse,
    'effects.starfield.connectionsWhenNoMouse',
  );
  const percentStarsConnecting = assertFiniteNumber(
    source.percentStarsConnecting,
    'effects.starfield.percentStarsConnecting',
  );
  if (percentStarsConnecting < 0 || percentStarsConnecting > 100) {
    throw new Error('Missing or invalid effects.starfield.percentStarsConnecting (must be within [0, 100])');
  }

  let canvasGradient: string[] | null;
  if (source.canvasGradient === null) {
    canvasGradient = null;
  } else if (Array.isArray(source.canvasGradient) && source.canvasGradient.every((v) => typeof v === 'string')) {
    canvasGradient = source.canvasGradient;
  } else {
    throw new Error('Missing or invalid effects.starfield.canvasGradient (must be null or string[])');
  }

  const lineThickness = assertFiniteNumber(source.lineThickness, 'effects.starfield.lineThickness');
  if (lineThickness <= 0) {
    throw new Error('Missing or invalid effects.starfield.lineThickness (must be > 0)');
  }

  return {
    enabled: assertBoolean(source.enabled, 'effects.starfield.enabled'),
    starDensity: starDensity as 'low' | 'medium' | 'high' | 'ultra',
    starSize: { min: starSizeMin, max: starSizeMax },
    speedFactor,
    maxDistance,
    starColor,
    starOpacity,
    linkOpacity,
    starShapes: starShapes as ('circle' | 'star')[],
    parallaxEffect,
    parallaxStrength,
    mouseRadius,
    rotationSpeed: { min: rotationSpeedMin, max: rotationSpeedMax },
    connectionsWhenNoMouse,
    percentStarsConnecting,
    canvasGradient,
    lineThickness,
  };
}

function resolveImageLazyLoadConfig(config: unknown): SiteImageConfig['lazyLoad'] {
  const source = assertObject<Partial<SiteImageConfig['lazyLoad']>>(config, 'image.lazyLoad');
  const rootMargin = assertString(source.rootMargin, 'image.lazyLoad.rootMargin');
  const localDebugDelayMs = assertFiniteNumber(
    source.localDebugDelayMs,
    'image.lazyLoad.localDebugDelayMs',
  );

  if (!Number.isInteger(localDebugDelayMs) || localDebugDelayMs < 0) {
    throw new Error('Missing or invalid image.lazyLoad.localDebugDelayMs (must be a non-negative integer)');
  }

  return {
    rootMargin,
    localDebugDelayMs,
  };
}

function resolveImagePlaceholderEffectConfig(config: unknown): SiteImageConfig['placeholderEffect'] {
  const effectName = assertString(config, 'image.placeholderEffect');

  if (!isImageLoadingEffectName(effectName)) {
    throw new Error(
      `Missing or invalid image.placeholderEffect (must be one of: ${IMAGE_LOADING_EFFECT_NAMES.join(', ')})`,
    );
  }

  return effectName;
}

function resolveSiteImageConfig(config: unknown): SiteImageConfig {
  const source = assertObject<Partial<SiteImageConfig>>(config, 'image');
  const format = assertString(source.format, 'image.format');
  const quality = assertFiniteNumber(source.quality, 'image.quality');

  if (!Number.isInteger(quality) || quality < 1 || quality > 100) {
    throw new Error('Missing or invalid image.quality (must be an integer in [1, 100])');
  }

  const widths = source.widths;
  const widthConfig = assertObject<SiteImageConfig['widths']>(widths, 'image.widths');

  const normalizeWidths = (values: unknown, key: string): number[] => {
    if (!Array.isArray(values) || values.length === 0) {
      throw new Error(`Missing or invalid ${key} (must be a non-empty number array)`);
    }

    return values.map((value) => {
      if (!Number.isInteger(value) || value <= 0) {
        throw new Error(`Missing or invalid ${key} entry (must be positive integer)`);
      }
      return value;
    });
  };

  const dprScale = assertObject<SiteImageConfig['dprScale']>(source.dprScale, 'image.dprScale');

  const lowScale = assertFiniteNumber(dprScale.low, 'image.dprScale.low');
  const mediumScale = assertFiniteNumber(dprScale.medium, 'image.dprScale.medium');
  const highScale = assertFiniteNumber(dprScale.high, 'image.dprScale.high');
  if (lowScale <= 0 || mediumScale <= 0 || highScale <= 0) {
    throw new Error('Missing or invalid image.dprScale values (must be > 0)');
  }

  return {
    format,
    quality,
    widths: {
      medium: normalizeWidths(widthConfig.medium, 'image.widths.medium'),
      high: normalizeWidths(widthConfig.high, 'image.widths.high'),
    },
    dprScale: {
      low: lowScale,
      medium: mediumScale,
      high: highScale,
    },
    lazyLoad: resolveImageLazyLoadConfig(source.lazyLoad),
    placeholderEffect: resolveImagePlaceholderEffectConfig(source.placeholderEffect),
  };
}

function resolvePhotographyConfig(config: SiteConfig['photography']): PhotographyPageConfig {
  const source = config as Partial<PhotographyPageConfig>;

  if (!source.hero || typeof source.hero !== 'object' || Array.isArray(source.hero)) {
    throw new Error('Missing or invalid photography.hero configuration object');
  }

  if (!source.grid || typeof source.grid !== 'object' || Array.isArray(source.grid)) {
    throw new Error('Missing or invalid photography.grid configuration object');
  }

  return {
    hero: source.hero,
    grid: source.grid,
  };
}

function parseSiteConfig(raw: string): SiteConfig {
  const parsed = parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid site config JSONC content');
  }

  return parsed as SiteConfig;
}

function buildFeaturedMediaConfig(featured: SiteConfig['home']['featuredMedia']): SiteConfig['home']['featuredMedia'] {
  const carousel = featured.carousel;

  return {
    items: featured.items,
    carousel: {
      ariaLabel: carousel.ariaLabel,
      prevButtonAriaLabel: carousel.prevButtonAriaLabel,
      nextButtonAriaLabel: carousel.nextButtonAriaLabel,
      emptyText: carousel.emptyText,
      showNavigationArrows: carousel.showNavigationArrows,
      showIndicator: carousel.showIndicator,
      counterPadLength: carousel.counterPadLength,
      visual: resolveFeaturedCarouselVisual(carousel.visual),
    },
  };
}

const siteConfig = parseSiteConfig(siteConfigRaw);

function normalizeProfile(profileData: ProfileData): ProfileData {
  return {
    ...profileData,
    facts: profileData.facts.map((fact) => ({
      id: fact.id.trim(),
      value: fact.value.trim(),
    })),
  };
}

export async function loadProfile(): Promise<ProfileData> {
  return normalizeProfile(profile as ProfileData);
}

export async function loadSiteConfig(): Promise<SiteConfig> {
  return siteConfig;
}

export async function loadNavigationConfig(): Promise<NavigationConfig> {
  return siteConfig.navigation;
}

export async function loadHomepageConfig(): Promise<HomePageConfigGroup> {
  const { home, navigation } = siteConfig;

  return {
    hero: home.hero,
    layout: home.layout,
    editorialHero: home.editorialHero,
    pageLinks: home.pageLinks,
    featuredMedia: buildFeaturedMediaConfig(home.featuredMedia),
    support: home.support,
    navigationLabels: navigation.labels,
  };
}

export async function loadMediaConfig(): Promise<MediaConfig> {
  const featuredMedia = buildFeaturedMediaConfig(siteConfig.home.featuredMedia);

  return {
    grid: siteConfig.photography.grid,
    image: resolveSiteImageConfig(siteConfig.image),
    homepage: {
      featured: featuredMedia.items,
      carousel: featuredMedia.carousel,
    },
  };
}

export async function loadIntroduction(): Promise<string> {
  return introductionRaw;
}

export async function loadPhotography(): Promise<PhotographyPageConfig> {
  return resolvePhotographyConfig(siteConfig.photography);
}

export async function loadSiteMetadata(): Promise<SiteMetadata> {
  return siteConfig.metadata;
}

export async function loadEffectsConfig(): Promise<SiteEffectsConfig> {
  const effects = siteConfig.effects;
  if (!effects || typeof effects !== 'object' || Array.isArray(effects)) {
    throw new Error('Missing or invalid effects configuration');
  }

  return {
    starfield: resolveStarfieldEffectConfig((effects as Partial<SiteEffectsConfig>).starfield),
  };
}

import { loadMediaConfig } from './config-loader';
import { assertPositiveInteger } from './assertions';
import type {
  ContentImage,
  ContentImageOptions,
  ContentImageSurface,
  FeaturedSlide,
  MediaConfig,
  MediaImage,
  MediaTree,
} from './content-types';
import {
  HOME_COVERFLOW_SIZES,
  IMAGE_MEDIUM_WIDTHS_KEY,
  assertMediaConfigShape,
  deriveGalleryInferredWidthsFromGrid,
  getValidatedHomepageGalleryConfig,
  loadFeaturedSlidesForHomepage,
  loadMediaTreeFromGallery,
  loadContentImageResolved,
  selectCandidateWidthsByPolicy,
} from './media-loader-core';

let mediaConfigCache: MediaConfig | null = null;
let mediaConfigPromise: Promise<MediaConfig> | null = null;
const ABOUT_AVATAR_SIZES = '(max-width: 767px) 180px, 220px';
const ABOUT_AVATAR_INFERRED_WIDTHS = [180, 220];

interface SurfaceSizingProfile {
  inferredWidths: number[];
  sizes: string;
}

function resolveMediumSurfaceProfile(
  mediaConfig: MediaConfig,
  surface: Exclude<ContentImageSurface, 'homepage'>,
): SurfaceSizingProfile {
  if (surface === 'about') {
    return {
      inferredWidths: ABOUT_AVATAR_INFERRED_WIDTHS,
      sizes: ABOUT_AVATAR_SIZES,
    };
  }

  return {
    inferredWidths: deriveGalleryInferredWidthsFromGrid(mediaConfig.grid),
    sizes: buildGallerySizes(mediaConfig.grid),
  };
}

async function getMediaConfigCached(): Promise<MediaConfig> {
  if (import.meta.env.DEV) {
    const config = await loadMediaConfig();
    assertMediaConfigShape(config);
    mediaConfigCache = config;
    mediaConfigPromise = Promise.resolve(config);
    return config;
  }

  if (mediaConfigCache) {
    return mediaConfigCache;
  }

  if (!mediaConfigPromise) {
    mediaConfigPromise = loadMediaConfig().then((config) => {
      assertMediaConfigShape(config);
      mediaConfigCache = config;
      return config;
    });
  }

  return mediaConfigPromise;
}

async function deriveContentImageOptionsFromConfig(
  mediaConfig: MediaConfig,
  surface: ContentImageSurface,
  overrides: Partial<ContentImageOptions>
): Promise<ContentImageOptions> {
  const globalImage = mediaConfig.image;
  const common = {
    format: globalImage.format,
    quality: globalImage.quality,
  };
  const homepageGalleryConfig = surface === 'homepage'
    ? await getValidatedHomepageGalleryConfig(getMediaConfigCached)
    : null;

  const base: ContentImageOptions = surface === 'homepage'
    ? {
        ...common,
        widths: homepageGalleryConfig?.image.widths,
        sizes: HOME_COVERFLOW_SIZES,
      }
    : buildMediumSurfaceOptions(mediaConfig, surface, common);

  return {
    alt: overrides.alt ?? base.alt,
    format: overrides.format ?? base.format,
    quality: overrides.quality ?? base.quality,
    widths: overrides.widths ?? base.widths,
    sizes: overrides.sizes ?? base.sizes,
    maxLongEdge: overrides.maxLongEdge ?? base.maxLongEdge,
  };
}

function buildMediumSurfaceOptions(
  mediaConfig: MediaConfig,
  surface: Exclude<ContentImageSurface, 'homepage'>,
  common: Pick<ContentImageOptions, 'format' | 'quality'>,
): ContentImageOptions {
  const profile = resolveMediumSurfaceProfile(mediaConfig, surface);

  return {
    ...common,
    widths: selectCandidateWidthsByPolicy({
      candidateWidths: mediaConfig.image.widths.medium,
      inferredWidths: profile.inferredWidths,
      dprScale: mediaConfig.image.dprScale.medium,
      key: IMAGE_MEDIUM_WIDTHS_KEY,
    }),
    sizes: profile.sizes,
  };
}

function buildGallerySizes(grid: MediaConfig['grid']): string {
  const mobileColumns = assertPositiveInteger(
    grid.columns.mobile,
    'photography.grid.columns.mobile',
  );
  const desktopColumns = assertPositiveInteger(
    grid.columns.desktop,
    'photography.grid.columns.desktop',
  );

  const mobileWidth = (100 / mobileColumns).toFixed(2);
  const desktopWidth = (100 / desktopColumns).toFixed(2);

  return [
    `(max-width: 767px) ${mobileWidth}vw`,
    `${desktopWidth}vw`,
  ].join(', ');
}

export async function deriveContentImageOptions(
  surface: ContentImageSurface,
  overrides: Partial<ContentImageOptions>
): Promise<ContentImageOptions> {
  const mediaConfig = await getMediaConfigCached();
  return deriveContentImageOptionsFromConfig(mediaConfig, surface, overrides);
}

export async function loadContentImage(path: string, options: ContentImageOptions): Promise<ContentImage | null> {
  await getMediaConfigCached();
  return loadContentImageResolved(path, options);
}

export async function loadFeaturedSlides(): Promise<FeaturedSlide[]> {
  const homepageGalleryConfig = await getValidatedHomepageGalleryConfig(getMediaConfigCached);
  const homeImageOptions = await deriveContentImageOptions('homepage', {});

  return loadFeaturedSlidesForHomepage(homepageGalleryConfig.featured, homeImageOptions, loadContentImage);
}

function mapGalleryImage(path: string, options: ContentImageOptions): MediaImage | null {
  const imageAsset = loadContentImageResolved(path, options);

  if (!imageAsset) {
    return null;
  }

  return {
    path: imageAsset.path,
    alt: imageAsset.alt,
    width: imageAsset.width,
    height: imageAsset.height,
    aspectRatio: imageAsset.aspectRatio,
    responsive: imageAsset.responsive,
    src: imageAsset.source,
  };
}

export async function loadMediaTree(): Promise<MediaTree> {
  const mediaConfig = await getMediaConfigCached();
  const galleryImageOptions = await deriveContentImageOptionsFromConfig(mediaConfig, 'gallery', {});

  return loadMediaTreeFromGallery(mediaConfig.grid, galleryImageOptions, mapGalleryImage);
}

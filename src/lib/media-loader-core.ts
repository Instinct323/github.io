import type { ImageMetadata } from 'astro';
import { getImage } from 'astro:assets';

import {
  compareNatural,
  filenameWithoutExt,
  folderNameToSlug,
  slugToTitle,
  stripNumericPrefix,
} from './content-normalize';
import type {
  ContentImage,
  ContentImageOptions,
  ContentImageResponsive,
  FeaturedSlide,
  HomePageCarouselConfig,
  HomePageImageConfig,
  MediaAlbum,
  MediaCategory,
  MediaConfig,
  MediaImage,
  MediaTree,
} from './content-types';

interface ParsedMediaPath {
  album?: string;
  alt: string;
  categoryId: string;
  categoryTitle: string;
}

export const CONTENT_IMAGE_MODULES = import.meta.glob<{ default: ImageMetadata }>(
  '../../content/**/*.{jpg,jpeg,png,webp}',
  { eager: true }
);

const CONTENT_IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|webp)$/i;


export const RESPONSIVE_WIDTH_STEPS = [320, 480, 640, 768, 960, 1200, 1600, 2000, 2400];
export const HOME_COVERFLOW_MOBILE_BREAKPOINT = 767;
export const HOME_COVERFLOW_SIZES = `(max-width: ${HOME_COVERFLOW_MOBILE_BREAKPOINT}px) 480px, (max-width: 1024px) 640px, 768px`;
export const RESPONSIVE_VIEWPORT_WIDTHS = {
  desktop: 1440,
  tablet: 1024,
  mobile: 375,
} as const;

export interface ResponsiveWidthProfile {
  desktop: number;
  tablet: number;
  mobile: number;
}

interface ResponsiveSlideWidthPercent {
  desktop: string;
  tablet: string;
  mobile: string;
}

export interface CandidateWidthPolicyInput {
  candidateWidths: number[];
  inferredWidths: number[];
  dprScale: number;
  key: string;
  maxSelectableWidth?: number;
}

export interface ImageVariantSet {
  src: string;
  srcset: string;
  width: number;
  height: number;
}

export const IMAGE_MEDIUM_WIDTHS_KEY = 'image.widths.medium';
export const IMAGE_HIGH_WIDTHS_KEY = 'image.widths.high';

export interface ValidatedHomepageGalleryConfig {
  featured: string[];
  image: HomePageImageConfig;
  carousel: HomePageCarouselConfig;
}

let homepageGalleryConfigCache: ValidatedHomepageGalleryConfig | null = null;

export function deriveCarouselResponsiveWidths(
  viewportWidth: number,
  cssPercentage: number,
  maxLongEdge: number
): number[] {
  if (maxLongEdge <= 0) {
    return [];
  }

  const targetWidth = Math.round(viewportWidth * (cssPercentage / 100));
  const effectiveMaxWidth = Math.min(targetWidth, maxLongEdge);

  const widths = RESPONSIVE_WIDTH_STEPS.filter(width => width < effectiveMaxWidth);
  
  if (effectiveMaxWidth > 0) {
    widths.push(effectiveMaxWidth);
  }

  return Array.from(new Set(widths.filter(width => width > 0))).sort((a, b) => a - b);
}

export function deriveLayoutResponsiveWidths(
  profile: ResponsiveWidthProfile,
  maxLongEdge: number
): number[] {
  const entries: Array<[keyof ResponsiveWidthProfile, number]> = [
    ['desktop', RESPONSIVE_VIEWPORT_WIDTHS.desktop],
    ['tablet', RESPONSIVE_VIEWPORT_WIDTHS.tablet],
    ['mobile', RESPONSIVE_VIEWPORT_WIDTHS.mobile],
  ];
  const merged = entries.flatMap(([key, viewport]) => {
    return deriveCarouselResponsiveWidths(viewport, profile[key], maxLongEdge);
  });

  return Array.from(new Set(merged))
    .sort((a, b) => a - b);
}

function parseResponsivePercentage(value: string, key: string): number {
  const match = value.match(/(\d+(?:\.\d+)?)/);
  if (!match) {
    throw new Error(`Invalid ${key} value: "${value}".`);
  }

  const parsed = Number.parseFloat(match[1]);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${key} value: "${value}".`);
  }

  return parsed;
}

export function deriveCarouselInferredWidths(slideWidth: ResponsiveSlideWidthPercent): number[] {
  const profile: ResponsiveWidthProfile = {
    desktop: parseResponsivePercentage(slideWidth.desktop, 'carousel.slideWidth.desktop'),
    tablet: parseResponsivePercentage(slideWidth.tablet, 'carousel.slideWidth.tablet'),
    mobile: parseResponsivePercentage(slideWidth.mobile, 'carousel.slideWidth.mobile'),
  };

  return deriveLayoutResponsiveWidths(profile, Number.POSITIVE_INFINITY);
}

function parseGridGapToPx(gap: string): number {
  const normalized = gap.trim();
  const matched = normalized.match(/^(\d+(?:\.\d+)?)(px|rem)$/);

  if (!matched) {
    throw new Error(`Invalid photography.grid.gap: "${gap}". Expected px or rem value.`);
  }

  const value = Number.parseFloat(matched[1]);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid photography.grid.gap: "${gap}". Expected a non-negative value.`);
  }

  return matched[2] === 'rem' ? value * 16 : value;
}

function deriveGridCellWidth(viewportWidth: number, columns: number, gapPx: number): number {
  if (!Number.isInteger(columns) || columns <= 0) {
    throw new Error(`Invalid grid columns: expected a positive integer, received ${String(columns)}.`);
  }

  const totalGap = (columns - 1) * gapPx;
  const contentWidth = viewportWidth - totalGap;

  if (contentWidth <= 0) {
    throw new Error('Invalid gallery grid config: horizontal gaps exceed viewport width.');
  }

  return Math.round(contentWidth / columns);
}

export function deriveGalleryInferredWidthsFromGrid(grid: MediaConfig['grid']): number[] {
  const gapPx = parseGridGapToPx(grid.gap);

  return [
    deriveGridCellWidth(RESPONSIVE_VIEWPORT_WIDTHS.mobile, grid.columns.mobile, gapPx),
    deriveGridCellWidth(RESPONSIVE_VIEWPORT_WIDTHS.tablet, grid.columns.desktop, gapPx),
    deriveGridCellWidth(RESPONSIVE_VIEWPORT_WIDTHS.desktop, grid.columns.desktop, gapPx),
  ];
}

export function assertStrictlyIncreasingPositiveWidths(widths: unknown, key: string): number[] {
  if (!Array.isArray(widths) || widths.length === 0) {
    throw new Error(`Invalid ${key}: expected a non-empty array of strictly increasing positive numbers.`);
  }

  let previous = 0;

  return widths.map((width, index) => {
    if (typeof width !== 'number' || !Number.isFinite(width) || width <= 0) {
      throw new Error(`Invalid ${key}[${index}]: expected a positive number, received ${String(width)}.`);
    }

    if (width <= previous) {
      throw new Error(`Invalid ${key}: expected a strictly increasing list of positive numbers.`);
    }

    previous = width;
    return width;
  });
}

export function selectCandidateWidthsByPolicy(input: CandidateWidthPolicyInput): number[] {
  const {
    candidateWidths,
    inferredWidths,
    dprScale,
    key,
    maxSelectableWidth,
  } = input;

  const normalizedScale = assertPositiveScale(dprScale, `${key}.dprScale`);
  const normalizedCandidates = normalizeCandidateWidths(candidateWidths, key, maxSelectableWidth);
  const normalizedInferred = normalizeInferredWidths(inferredWidths, key);
  const targetWidth = computeScaledTargetWidth(normalizedInferred, normalizedScale);
  const selected = selectSingleBucket(normalizedCandidates, targetWidth);

  return [selected];
}

function normalizeInferredWidths(inferredWidths: number[], key: string): number[] {
  return assertStrictlyIncreasingPositiveWidths(
    Array.from(new Set(inferredWidths)).sort((a, b) => a - b),
    `${key}.inferredWidths`,
  );
}

function computeScaledTargetWidth(inferredWidths: number[], dprScale: number): number {
  return Math.ceil(Math.max(...inferredWidths) * dprScale);
}

function selectSingleBucket(candidateWidths: number[], targetWidth: number): number {
  const matched = candidateWidths.find((candidateWidth) => candidateWidth >= targetWidth);
  return matched ?? candidateWidths[candidateWidths.length - 1];
}

function assertPositiveScale(value: unknown, key: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    throw new Error(`Invalid ${key}: expected a positive number.`);
  }

  return value;
}

export function assertMediaConfigShape(config: MediaConfig): void {
  if (!config.grid?.columns || !config.image || !config.homepage?.carousel) {
    throw new Error('Invalid site config: missing media grid/image/carousel settings.');
  }

  assertStrictlyIncreasingPositiveWidths(config.image.widths?.medium, IMAGE_MEDIUM_WIDTHS_KEY);
  assertStrictlyIncreasingPositiveWidths(config.image.widths?.high, IMAGE_HIGH_WIDTHS_KEY);

  assertPositiveScale(config.image.dprScale?.medium, 'image.dprScale.medium');
  assertPositiveScale(config.image.dprScale?.high, 'image.dprScale.high');
}

function calculateCarouselWidths(
  slideWidth: HomePageCarouselConfig['visual']['slideWidth'],
  candidateWidths: number[],
  homepageDprScale: number,
): number[] {
  const inferredWidths = deriveCarouselInferredWidths(slideWidth);

  return selectCandidateWidthsByPolicy({
    candidateWidths,
    inferredWidths,
    dprScale: homepageDprScale,
    key: IMAGE_MEDIUM_WIDTHS_KEY,
  });
}

function normalizeCandidateWidths(
  candidateWidths: number[],
  key: string,
  maxSelectableWidth?: number,
): number[] {
  const normalizedCandidates = assertStrictlyIncreasingPositiveWidths(candidateWidths, key);

  if (maxSelectableWidth === undefined) {
    return normalizedCandidates;
  }

  const normalizedMax = assertPositiveScale(maxSelectableWidth, `${key}.maxSelectableWidth`);
  const bounded = normalizedCandidates.filter((candidateWidth) => candidateWidth <= normalizedMax);

  if (bounded.length > 0) {
    return bounded;
  }

  throw new Error(`Invalid ${key}: no candidate width is <= maxSelectableWidth (${normalizedMax}).`);
}

function validateHomepageFeaturedPath(entry: unknown, index: number): string {
  if (typeof entry !== 'string' || !entry.trim()) {
    throw new Error(`Invalid homepage.featured[${index}]: expected a non-empty string path relative to content/media/.`);
  }

  const rawPath = entry.trim();
  const normalizedPath = normalizeContentImagePath(`media/${rawPath}`);

  if (!normalizedPath || !normalizedPath.startsWith('media/')) {
    throw new Error(`Invalid homepage.featured[${index}]: "${rawPath}" is not a valid content/media image path.`);
  }

  if (!resolveContentImageMetadata(normalizedPath)) {
    throw new Error(`Invalid homepage.featured[${index}]: "${rawPath}" does not resolve to an existing image under content/media/.`);
  }

  return normalizedPath;
}

export async function getValidatedHomepageGalleryConfig(
  getMediaConfigCached: () => Promise<MediaConfig>
): Promise<ValidatedHomepageGalleryConfig> {
  if (import.meta.env.DEV) {
    homepageGalleryConfigCache = null;
  }

  if (homepageGalleryConfigCache) {
    return homepageGalleryConfigCache;
  }

  const mediaConfig = await getMediaConfigCached();
  const homepageConfig = mediaConfig.homepage;
  const featured = homepageConfig?.featured;
  const carousel = homepageConfig?.carousel;
  const globalImage = mediaConfig.image;

  if (!Array.isArray(featured)) {
    throw new Error('Invalid homepage.featured: expected an array of image paths relative to content/media/.');
  }

  if (typeof globalImage?.format !== 'string' || !globalImage.format.trim()) {
    throw new Error('Invalid image.format: expected a non-empty string.');
  }

  if (typeof globalImage?.quality !== 'number' || !Number.isFinite(globalImage.quality) || globalImage.quality <= 0) {
    throw new Error('Invalid image.quality: expected a positive number.');
  }

  if (!carousel || typeof carousel !== 'object') {
    throw new Error('Invalid homepage.carousel: expected carousel settings.');
  }

  const homepageDprScale = assertPositiveScale(
    globalImage.dprScale.medium,
    'image.dprScale.medium',
  );

  const calculatedWidths = calculateCarouselWidths(
    carousel.visual.slideWidth,
    globalImage.widths.medium,
    homepageDprScale,
  );
  const widths = assertStrictlyIncreasingPositiveWidths(calculatedWidths, 'calculated carousel widths');
  const resolvedFeatured = featured.map((entry, index) => validateHomepageFeaturedPath(entry, index));

  if (resolvedFeatured.length < 3) {
    throw new Error(`Invalid homepage.featured: expected at least 3 valid images, received ${resolvedFeatured.length}.`);
  }

  homepageGalleryConfigCache = {
    featured: resolvedFeatured,
    image: {
      format: globalImage.format.trim(),
      quality: globalImage.quality,
      widths,
    },
    carousel,
  };

  return homepageGalleryConfigCache;
}

export async function loadFeaturedSlidesForHomepage(
  featuredPaths: string[],
  homeImageOptions: ContentImageOptions,
  loadContentImage: (_path: string, _options: ContentImageOptions) => Promise<ContentImage | null>
): Promise<FeaturedSlide[]> {
  const featuredImages = await Promise.all(featuredPaths.map(async (path) => {
    const image = await loadContentImage(path, homeImageOptions);

    if (!image) {
      throw new Error(`Invalid homepage.featured: failed to load validated image "${path}".`);
    }

    return image;
  }));

  return Promise.all(featuredImages.map((image) => createFeaturedSlide(image)));
}

export function normalizeContentImagePath(path: string): string | null {
  const normalizedPath = path.trim().replace(/^\.\//, '').replace(/^\//, '');

  if (!normalizedPath || normalizedPath.includes('..') || !CONTENT_IMAGE_EXTENSIONS.test(normalizedPath)) {
    return null;
  }

  return normalizedPath.startsWith('content/') ? normalizedPath.slice('content/'.length) : normalizedPath;
}

export function resolveContentImageMetadata(path: string): ImageMetadata | null {
  const normalizedPath = normalizeContentImagePath(path);

  if (!normalizedPath) {
    return null;
  }

  return CONTENT_IMAGE_MODULES[`../../content/${normalizedPath}`]?.default ?? null;
}

function parseMediaPath(path: string): ParsedMediaPath | null {
  const segments = path.split('/');
  const mediaIndex = segments.indexOf('media');

  if (mediaIndex === -1 || segments.length <= mediaIndex + 2) {
    return null;
  }

  const categoryFolder = segments[mediaIndex + 1];
  const filename = segments[segments.length - 1];
  const albumFolder = segments.length > mediaIndex + 3 ? segments[mediaIndex + 2] : undefined;
  const categoryId = folderNameToSlug(categoryFolder);
  const album = albumFolder ? stripNumericPrefix(albumFolder) : undefined;
  const filenameBase = filenameWithoutExt(filename);
  const categoryTitle = slugToTitle(categoryId);
  const alt = album ? `${album} - ${filenameBase}` : `${categoryTitle} - ${filenameBase}`;

  return {
    album,
    alt,
    categoryId,
    categoryTitle,
  };
}

function fallbackAltFromContentPath(path: string): string {
  const normalizedPath = normalizeContentImagePath(path);

  if (!normalizedPath) {
    return 'Image';
  }

  if (normalizedPath.startsWith('media/')) {
    const parsed = parseMediaPath(`../../content/${normalizedPath}`);
    if (parsed?.alt) {
      return parsed.alt;
    }
  }

  const filename = normalizedPath.split('/').pop();
  return filename ? slugToTitle(filenameWithoutExt(filename)) : 'Image';
}

function resolveContentImageAlt(path: string, alt?: string): string {
  if (typeof alt === 'string' && alt.trim()) {
    return alt.trim();
  }

  return fallbackAltFromContentPath(path);
}

function getMaxResponsiveWidth(source: ImageMetadata, maxLongEdge: number): number {
  const longEdge = Math.max(source.width, source.height);
  const scale = Math.min(1, maxLongEdge / longEdge);
  return Math.max(1, Math.round(source.width * scale));
}

function deriveResponsiveWidths(source: ImageMetadata, options: ContentImageOptions): number[] {
  const explicitWidths = normalizeExplicitWidths(options.widths);

  if (explicitWidths.length > 0) {
    return capWidthsBySourceWidth(explicitWidths, source.width);
  }

  const maxLongEdge = assertPositiveScale(options.maxLongEdge, 'maxLongEdge');
  const maxWidth = getMaxResponsiveWidth(source, maxLongEdge);
  const widths = RESPONSIVE_WIDTH_STEPS.filter(width => width < maxWidth);

  widths.push(maxWidth);

  return Array.from(new Set(widths.filter(width => width > 0))).sort((a, b) => a - b);
}

function buildContentImageResponsive(source: ImageMetadata, options: ContentImageOptions): ContentImageResponsive {
  const widths = deriveResponsiveWidths(source, options);

  const format = options.format;
  if (!format || typeof format !== 'string') {
    throw new Error('format is required and must be a non-empty string');
  }

  const quality = assertPositiveScale(options.quality, 'quality');

  return {
    src: source.src,
    srcset: `${source.src} ${source.width}w`,
    format,
    quality,
    widths,
    sizes: options.sizes,
    maxLongEdge: options.maxLongEdge,
  };
}

export function loadContentImageResolved(path: string, options: ContentImageOptions): ContentImage | null {
  const normalizedPath = normalizeContentImagePath(path);
  const source = resolveContentImageMetadata(path);

  if (!normalizedPath || !source) {
    return null;
  }

  return {
    path: normalizedPath,
    source,
    alt: resolveContentImageAlt(normalizedPath, options.alt),
    width: source.width,
    height: source.height,
    aspectRatio: source.width / source.height,
    responsive: buildContentImageResponsive(source, options),
  };
}

function normalizeExplicitWidths(widths: number[] | undefined): number[] {
  if (!Array.isArray(widths)) {
    return [];
  }

  const normalized = Array.from(
    new Set(
      widths
        .map((width) => Math.round(width))
        .filter((width) => Number.isFinite(width) && width > 0),
    ),
  ).sort((a, b) => a - b);

  return normalized;
}

function capWidthsBySourceWidth(widths: number[], sourceWidth: number): number[] {
  const bounded = widths.filter((width) => width <= sourceWidth);
  return bounded.length > 0 ? bounded : [sourceWidth];
}

function deriveRenderableWidths(image: ContentImage): number[] {
  const responsiveWidths = image.responsive.widths
    .filter((width) => Number.isInteger(width) && width > 0 && width <= image.width);
  const normalizedWidths = Array.from(new Set(responsiveWidths)).sort((a, b) => a - b);
  return normalizedWidths.length > 0 ? normalizedWidths : [image.width];
}

export async function buildImageVariantSet(image: ContentImage): Promise<ImageVariantSet> {
  const widths = deriveRenderableWidths(image);
  const variants = await Promise.all(
    widths.map((width) =>
      getImage({
        src: image.source,
        width,
        format: image.responsive.format,
        quality: image.responsive.quality,
      }),
    ),
  );

  const fallback = variants[variants.length - 1];
  const outputWidth = widths[widths.length - 1] ?? image.width;
  const outputHeight = Math.max(1, Math.round(outputWidth / image.aspectRatio));

  return {
    src: fallback.src,
    srcset: variants
      .map((variant, index) => `${variant.src} ${widths[index]}w`)
      .join(', '),
    width: outputWidth,
    height: outputHeight,
  };
}

export async function createFeaturedSlide(image: ContentImage): Promise<FeaturedSlide> {
  const variantSet = await buildImageVariantSet(image);

  return {
    src: variantSet.src,
    srcset: variantSet.srcset,
    sizes: image.responsive.sizes ?? HOME_COVERFLOW_SIZES,
    alt: image.alt,
    width: variantSet.width,
    height: variantSet.height,
    aspectRatio: image.aspectRatio,
    image,
  };
}

export type CategoryAccumulator = {
  id: string;
  title: string;
  testId: string;
  images: MediaImage[];
  albumsMap: Map<string, MediaAlbum>;
};

export function appendImageToCategoryMap(
  categoryMap: Map<string, CategoryAccumulator>,
  path: string,
  image: MediaImage
): void {
  const parsed = parseMediaPath(path);

  if (!parsed) {
    return;
  }

  if (!categoryMap.has(parsed.categoryId)) {
    categoryMap.set(parsed.categoryId, {
      id: parsed.categoryId,
      title: parsed.categoryTitle,
      testId: `gallery-${parsed.categoryId}`,
      images: [],
      albumsMap: new Map<string, MediaAlbum>(),
    });
  }

  const category = categoryMap.get(parsed.categoryId)!;

  image.alt = image.alt || parsed.alt;
  image.album = parsed.album;

  if (parsed.album) {
    if (!category.albumsMap.has(parsed.album)) {
      category.albumsMap.set(parsed.album, {
        id: parsed.album.toLowerCase().replace(/\s+/g, '-'),
        title: parsed.album,
        images: [],
      });
    }

    const album = category.albumsMap.get(parsed.album)!;

    album.images.push(image);
    return;
  }

  category.images.push(image);
}

export function compareMediaModuleEntries(
  [pathA]: [string, { default: ImageMetadata }],
  [pathB]: [string, { default: ImageMetadata }]
): number {
  return compareNatural(pathA, pathB);
}

function finalizeCategories(categoryMap: Map<string, CategoryAccumulator>): MediaCategory[] {
  return Array.from(categoryMap.values()).map((cat) => {
    const albums = Array.from(cat.albumsMap.values());
    return {
      id: cat.id,
      title: cat.title,
      testId: cat.testId,
      images: cat.images,
      albums: albums.length > 0 ? albums : undefined,
    };
  });
}

export async function loadMediaTreeFromGallery(
  gridConfig: MediaConfig['grid'],
  galleryImageOptions: ContentImageOptions,
  loadImageFromContentPath: (_path: string, _options: ContentImageOptions) => MediaImage | null
): Promise<MediaTree> {
  const categoryMap = new Map<string, CategoryAccumulator>();

  for (const [path, mod] of Object.entries(CONTENT_IMAGE_MODULES).sort(compareMediaModuleEntries)) {
    if (!path.includes('/content/media/') || !mod?.default) {
      continue;
    }

    const image = loadImageFromContentPath(path.replace('../../content/', ''), galleryImageOptions);

    if (!image) {
      continue;
    }

    appendImageToCategoryMap(categoryMap, path, image);
  }

  return {
    categories: finalizeCategories(categoryMap),
    grid: {
      columns: gridConfig.columns,
      gap: gridConfig.gap,
    },
  };
}

import type { ImageMetadata } from 'astro';

export interface ProfileFact {
  id: string;
  value: string;
}

export interface ProfileData {
  facts: ProfileFact[];
  email?: string;
  website?: string;
  social?: {
    github?: string;
    orcid?: string;
    googlescholar?: string;
    csdn?: string;
  };
}

export interface ResolvedProfileData extends ProfileData {
  name: string;
  location: string;
  organization: string;
}

export interface Publication {
  title: string;
  abstract?: string;
  authors: string[];
  date: string;
  source?: string;
  links?: Record<string, string>;
}

export interface SiteConfig {
  metadata: SiteMetadata;
  navigation: SiteNavigation;
  home: HomePageConfig;
  image: SiteImageConfig;
  photography: PhotographyPageConfig;
  effects: SiteEffectsConfig;
}

export type SiteMetadataConfig = SiteConfig['metadata'];
export type NavigationConfig = SiteConfig['navigation'];

export interface HomePageConfigGroup {
  hero: SiteConfig['home']['hero'];
  layout: SiteConfig['home']['layout'];
  editorialHero: SiteConfig['home']['editorialHero'];
  pageLinks: SiteConfig['home']['pageLinks'];
  featuredMedia: SiteConfig['home']['featuredMedia'];
  support: SiteConfig['home']['support'];
  navigationLabels: SiteConfig['navigation']['labels'];
}

export interface MediaConfig {
  grid: SiteConfig['photography']['grid'];
  image: SiteConfig['image'];
  homepage: {
    featured: SiteConfig['home']['featuredMedia']['items'];
    carousel: SiteConfig['home']['featuredMedia']['carousel'];
  };
}

export type SitePageKey = 'home' | 'about' | 'photography';

export interface SitePageMetadata {
  title: string;
  description: string;
}

export interface SiteMetadata {
  siteUrl: string;
  defaultTitle: string;
  defaultDescription: string;
  pages: Record<SitePageKey, SitePageMetadata>;
}

export interface SiteNavigation {
  labels: Record<SitePageKey, string>;
  ariaLabels: {
    primary: string;
    homeLinks: string;
  };
}

export interface HomePageHero {
  eyebrow: string;
}

export type HomepageSectionKey = 'hero' | 'carousel';
export type HomepageHeroDeckField = 'location' | 'organization';
export type HomepageEditorialGapVariant = 'tight' | 'roomy';

export interface GridColumns {
  desktop: number;
  mobile: number;
}

export interface MediaGridConfig {
  columns: GridColumns;
  gap: string;
}

export interface SiteImageConfig {
  format: string;
  quality: number;
  widths: {
    medium: number[];
    high: number[];
  };
  dprScale: {
    medium: number;
    high: number;
  };
}

export interface StarfieldEffectConfig {
  enabled: boolean;
  starDensity: 'low' | 'medium' | 'high' | 'ultra';
  starSize: {
    min: number;
    max: number;
  };
  speedFactor: number;
  maxDistance: number;
  starColor: string;
  starOpacity: number;
  linkOpacity: number;
  starShapes: ('circle' | 'star')[];
  parallaxEffect: boolean;
  parallaxStrength: number;
  mouseRadius: number;
  rotationSpeed: {
    min: number;
    max: number;
  };
  connectionsWhenNoMouse: boolean;
  percentStarsConnecting: number;
  canvasGradient: string[] | null;
  lineThickness: number;
}

export interface SiteEffectsConfig {
  starfield: StarfieldEffectConfig;
}

export interface HomePageImageConfig {
  quality: number;
  widths: number[];
  format: string;
}

export interface HomePageCarouselSlideWidth {
  desktop: string;
  tablet: string;
  mobile: string;
}

export interface HomePageCarouselVisualConfig {
  spaceBetween: number;
  slideWidth: HomePageCarouselSlideWidth;
  inactiveOpacity: number;
}

export interface HomePageCarouselConfig {
  ariaLabel: string;
  prevButtonAriaLabel: string;
  nextButtonAriaLabel: string;
  emptyText: string;
  showNavigationArrows: boolean;
  showIndicator: boolean;
  counterPadLength: number;
  visual: HomePageCarouselVisualConfig;
}

export interface HomePageFeaturedMediaConfig {
  items: string[];
  carousel: HomePageCarouselConfig;
}

export interface HomePageConfig {
  hero: HomePageHero;
  layout: {
    shell: 'default' | 'home' | 'about' | 'photography';
    contentWidth: 'compact' | 'standard' | 'wide';
    sectionOrder: HomepageSectionKey[];
    editorialGapVariant: HomepageEditorialGapVariant;
  };
  editorialHero: {
    deckFields: HomepageHeroDeckField[];
    showDeckDivider: boolean;
  };
  pageLinks: {
    order: Exclude<SitePageKey, 'home'>[];
    primaryKey: Exclude<SitePageKey, 'home'>;
  };
  featuredMedia: HomePageFeaturedMediaConfig;
  support: {
    text: string;
  };
}

export interface PhotographyHero {
  eyebrow: string;
  title: string;
  description: string;
}

export interface PhotographyPageConfig {
  hero: PhotographyHero;
  grid: MediaGridConfig;
}

export type Home = HomePageHero;
export interface HomepageConfig {
  layout: HomePageConfig['layout'];
  editorialHero: HomePageConfig['editorialHero'];
  pageLinks: HomePageConfig['pageLinks'];
  featuredCarousel: HomePageConfig['featuredMedia']['carousel'];
  supportRow: HomePageConfig['support'];
}
export type HomepageConfigSlice = HomePageConfigGroup;
export type Photography = PhotographyHero;

export type ContentImageSurface = 'homepage' | 'gallery' | 'about';

export interface ContentImageOptions {
  alt?: string;
  format?: string;
  quality?: number;
  widths?: number[];
  sizes?: string;
  maxLongEdge?: number;
}

export interface ContentImageResponsive {
  src: string;
  srcset: string;
  format: string;
  quality: number;
  widths: number[];
  sizes?: string;
  maxLongEdge?: number;
}

export interface ContentImage {
  path: string;
  source: ImageMetadata;
  alt: string;
  width: number;
  height: number;
  aspectRatio: number;
  responsive: ContentImageResponsive;
}

export interface MediaImage extends Omit<ContentImage, 'source'> {
  src: ImageMetadata;
  caption?: string;
  album?: string;
}

export interface MediaAlbum {
  id: string;
  title: string;
  images: MediaImage[];
}

export interface MediaCategory {
  id: string;
  title: string;
  testId: string;
  images: MediaImage[];
  albums?: MediaAlbum[];
}

export interface MediaTree {
  categories: MediaCategory[];
  grid: MediaGridConfig;
}

export interface FeaturedSlide {
  src: string;
  srcset: string;
  sizes: string;
  alt: string;
  width: number;
  height: number;
  aspectRatio: number;
  image: ContentImage;
}

export interface AboutPageData {
  profile: ProfileData;
  introductionHtml: string;
  publications: Publication[];
  avatarImage: ContentImage;
}

export interface HomePageData {
  profile: ResolvedProfileData;
  site: SiteConfig;
  home: HomePageHero;
}

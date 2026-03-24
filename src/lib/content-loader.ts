import {
  loadHomepageConfig,
  loadIntroduction,
  loadPhotography,
  loadProfile,
  loadSiteConfig,
} from './config-loader';
import { compareNatural, stripNumericPrefix } from './content-normalize';
import type {
  AboutPageData,
  HomePageData,
  ProfileData,
  ResolvedProfileData,
} from './content-types';
import {
  deriveContentImageOptions,
  loadContentImage,
  loadFeaturedSlides,
  loadMediaTree,
} from './media-loader';
import { renderMarkdown } from './markdown';
import type { Publication } from './content-types';
import { normalizePublication } from './publication-utils';

export type {
  AboutPageData,
  ContentImage,
  ContentImageOptions,
  ContentImageResponsive,
  ContentImageSurface,
  FeaturedSlide,
  GridColumns,
  Home,
  HomePageConfig,
  HomePageConfigGroup,
  HomePageFeaturedMediaConfig,
  HomePageHero,
  HomePageImageConfig,
  HomePageData,
  MediaAlbum,
  MediaCategory,
  MediaGridConfig,
  MediaImage,
  MediaTree,
  HomepageConfig,
  HomepageEditorialGapVariant,
  HomepageHeroDeckField,
  HomepageSectionKey,
  Photography,
  PhotographyHero,
  PhotographyPageConfig,
  ProfileData,
  ResolvedProfileData,
  ProfileFact,
  Publication,
  SiteConfig,
} from './content-types';

export {
  deriveContentImageOptions,
  loadContentImage,
  loadFeaturedSlides,
  loadIntroduction,
  loadMediaTree,
  loadPhotography,
  loadProfile,
  loadSiteConfig,
  stripNumericPrefix,
};

const REQUIRED_PROFILE_FACT_IDS = ['name', 'organization', 'location'] as const;

type RequiredProfileFactId = (typeof REQUIRED_PROFILE_FACT_IDS)[number];

const PUBLICATION_MODULES = import.meta.glob<{ default: Publication }>(
  '../../content/publication/*.json',
  { eager: true },
);

function requireProfileFactValue(profileData: ProfileData, id: RequiredProfileFactId): string {
  const fact = profileData.facts.find((item) => item.id === id);
  if (!fact) {
    throw new Error(`Missing required profile fact: ${id}`);
  }

  const value = fact.value.trim();
  if (!value) {
    throw new Error(`Profile fact \"${id}\" cannot be empty`);
  }

  return value;
}

function normalizeProfileForHome(profileData: ProfileData): ResolvedProfileData {
  const name = requireProfileFactValue(profileData, 'name');
  const organization = requireProfileFactValue(profileData, 'organization');
  const location = requireProfileFactValue(profileData, 'location');

  return {
    facts: profileData.facts,
    email: profileData.email,
    website: profileData.website,
    social: profileData.social,
    name,
    organization,
    location,
  };
}

function resolveAvatarAltFromProfile(profileData: ProfileData): string {
  return requireProfileFactValue(profileData, 'name');
}

export async function loadAboutPage(): Promise<AboutPageData> {
  const [profileData, introduction, publications] = await Promise.all([
    loadProfile(),
    loadIntroduction(),
    loadPublications(),
  ]);
  const aboutImageOptions = await deriveContentImageOptions('about', {
    alt: resolveAvatarAltFromProfile(profileData),
  });
  const avatarImage = await loadContentImage('config/avatar.jpg', aboutImageOptions);

  if (!avatarImage) {
    throw new Error('Missing about avatar image: content/config/avatar.jpg');
  }

  return {
    profile: profileData,
    introductionHtml: renderMarkdown(introduction),
    publications,
    avatarImage,
  };
}

export async function loadPublications(): Promise<Publication[]> {
  return Object.entries(PUBLICATION_MODULES)
    .sort(([pathA], [pathB]) => compareNatural(pathA, pathB))
    .map(([filePath, mod]) => normalizePublication(mod.default, filePath))
    .filter(Boolean)
    .sort((a, b) => compareNatural(b.date, a.date));
}

export async function loadHomePage(): Promise<HomePageData> {
  const [profileData, homepageConfig] = await Promise.all([
    loadProfile(),
    loadHomepageConfig(),
  ]);

  const site = await loadSiteConfig();

  return {
    profile: normalizeProfileForHome(profileData),
    site,
    home: homepageConfig.hero,
  };
}

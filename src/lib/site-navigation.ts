import { loadNavigationConfig } from './config-loader';
import type { SiteNavigation, SitePageKey } from './content-types';

export interface SiteNavRoute {
  key: SitePageKey;
  href: string;
  navTestId: string;
}

export interface SiteNavItem extends SiteNavRoute {
  label: string;
}

export interface SiteNavModel {
  ariaLabel: string;
  items: SiteNavItem[];
}

const NAV_ROUTES: Record<SitePageKey, SiteNavRoute> = {
  home: {
    key: 'home',
    href: '/',
    navTestId: 'nav-home',
  },
  about: {
    key: 'about',
    href: '/about',
    navTestId: 'nav-about',
  },
  photography: {
    key: 'photography',
    href: '/photography',
    navTestId: 'nav-photography',
  },
};

const PRIMARY_NAV_ORDER: SitePageKey[] = ['home', 'about', 'photography'];

function buildNavItems(links: SiteNavigation['labels'], routeKeys: SitePageKey[]): SiteNavItem[] {
  return routeKeys.map((key) => ({
    key,
    href: NAV_ROUTES[key].href,
    navTestId: NAV_ROUTES[key].navTestId,
    label: links[key].trim(),
  }));
}

export async function loadPrimaryNavModel(): Promise<SiteNavModel> {
  const navigation = await loadNavigationConfig();

  return {
    ariaLabel: navigation.ariaLabels.primary,
    items: buildNavItems(navigation.labels, PRIMARY_NAV_ORDER),
  };
}

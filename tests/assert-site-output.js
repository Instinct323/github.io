import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseJsonc } from 'jsonc-parser';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SITE_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(SITE_DIR, 'dist');
const SITE_CONFIG_PATH = path.join(SITE_DIR, 'content', 'config', 'site.jsonc');

const ROUTE_HTML_FILES = new Map([
  ['/', path.join(DIST_DIR, 'index.html')],
  ['/about/', path.join(DIST_DIR, 'about', 'index.html')],
  ['/photography/', path.join(DIST_DIR, 'photography', 'index.html')],
]);

const ASTRO_ASSET_PREFIX = '/_astro/';

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function readSiteConfig() {
  const raw = readFileSync(SITE_CONFIG_PATH, 'utf8');
  const cfg = parseJsonc(raw);
  assert.ok(cfg && typeof cfg === 'object', `Failed to parse site config: ${SITE_CONFIG_PATH}`);
  return cfg;
}

function readRouteHtml(fp) {
  assert.ok(existsSync(fp), `Built route file missing: ${fp}`);
  return readFileSync(fp, 'utf8');
}

function readStylesheetBundles(routeHtml, route) {
  const hrefPattern = /<link\b[^>]*\brel=(['"])stylesheet\1[^>]*\bhref=(['"])([^'"]+)\2/gi;
  const cssParts = [];
  let match = hrefPattern.exec(routeHtml);

  while (match !== null) {
    const href = match[3];
    if (!href.startsWith(ASTRO_ASSET_PREFIX) || !href.endsWith('.css')) {
      match = hrefPattern.exec(routeHtml);
      continue;
    }

    const assetPath = path.join(DIST_DIR, href.replace(/^\//, ''));
    assert.ok(existsSync(assetPath), `Route ${route} stylesheet missing: ${assetPath}`);
    cssParts.push(readFileSync(assetPath, 'utf8'));
    match = hrefPattern.exec(routeHtml);
  }

  assert.ok(cssParts.length > 0, `Route ${route} should reference at least one built stylesheet`);
  return cssParts.join('\n');
}

function getStartTagAttrsByTestId(html, testId) {
  const pattern = new RegExp(`<([a-zA-Z0-9-]+)\\b([^>]*)\\bdata-testid=(['"])${escapeRegExp(testId)}\\3([^>]*)>`, 'i');
  const match = html.match(pattern);
  assert.ok(match, `Missing data-testid="${testId}"`);
  return `${match[2]} ${match[4]}`;
}

function getAttribute(attrs, name) {
  const pattern = new RegExp(`\\b${escapeRegExp(name)}=(['"])(.*?)\\1`, 'i');
  const match = attrs.match(pattern);
  return match ? match[2] : null;
}

function assertHasTestId(html, testId) {
  const pattern = new RegExp(`\\bdata-testid=(['"])${escapeRegExp(testId)}\\1`, 'i');
  assert.match(html, pattern, `Missing data-testid="${testId}"`);
}

function assertCarouselHooks(homeHtml, _carouselConfig) {
  const attrs = getStartTagAttrsByTestId(homeHtml, 'home-carousel');

  assert.ok(getAttribute(attrs, 'aria-label'), 'Carousel aria-label should exist');
  assert.ok(getAttribute(attrs, 'data-space-between'), 'Carousel spacing hook should exist');
  assert.ok(getAttribute(attrs, 'data-counter-pad-length'), 'Carousel counter pad hook should exist');

  assertHasTestId(homeHtml, 'carousel-viewport');
}

function assertPrimaryNavOrder(routeHtml, route) {
  const expectedNavItems = [
    { key: 'home', href: '/' },
    { key: 'about', href: '/about/' },
    { key: 'photography', href: '/photography/' },
  ];

  let prevIndex = -1;
  for (const item of expectedNavItems) {
    const navPattern = new RegExp(`<a\\b[^>]*href=(['"])${escapeRegExp(item.href)}\\1[^>]*data-testid=(['"])nav-${item.key}\\2`, 'i');
    const navMatch = routeHtml.match(navPattern);
    assert.ok(navMatch, `Route ${route} is missing primary nav item nav-${item.key}`);

    const currentIndex = routeHtml.indexOf(navMatch[0]);
    assert.ok(currentIndex > prevIndex, `Route ${route} primary nav order should keep ${item.key} after previous link`);
    prevIndex = currentIndex;
  }
}

function collectHomeCtaClusterWarnings(homeHtml, cfg, warnings) {
  // Contract: redundant homepage CTA cluster means hero-level route links duplicate sticky header navigation.
  const hasClusterContainer = /\bdata-testid=(['"])home-route-links\1/i.test(homeHtml);
  const duplicatedKeys = cfg.home.pageLinks.order.filter((key) => {
    const linkPattern = new RegExp(`\\bdata-testid=(['"])home-link-${escapeRegExp(key)}\\1`, 'i');
    return linkPattern.test(homeHtml);
  });

  if (hasClusterContainer || duplicatedKeys.length > 0) {
    warnings.push({
      code: 'home-cta-cluster-present',
      route: '/',
      detail: `home-route-links found=${hasClusterContainer}; duplicated links=${duplicatedKeys.join(',') || 'none'}`,
    });
  }
}

function assertShellStyleOutput(routeHtml, route, shellName) {
  assert.match(routeHtml, new RegExp(`<body\\b[^>]*\\bdata-shell=(['"])${escapeRegExp(shellName)}\\1`, 'i'), `Route ${route} body should expose shell name ${shellName}`);
  const bodyMatch = routeHtml.match(/<body\b([^>]*)>/i);
  assert.ok(bodyMatch, `Route ${route} should include body tag`);
  const bodyAttrs = bodyMatch[1];
  const bodyInlineStyle = getAttribute(bodyAttrs, 'style');
  assert.ok(bodyInlineStyle && bodyInlineStyle.trim().length > 0, `Route ${route} body should include non-empty inline shell style`);

  const shellAttrs = getStartTagAttrsByTestId(routeHtml, 'site-shell');
  assert.equal(getAttribute(shellAttrs, 'data-shell'), shellName, `Route ${route} site shell should expose shell name ${shellName}`);
}

function assertPhotographyPageCompleteness(photographyHtml) {
  assertHasTestId(photographyHtml, 'photography-sticky-nav');
  assertHasTestId(photographyHtml, 'photography-page-description');

  const navChipPattern = /\bdata-testid=(['"])photography-chip-[^'"]+\1/gi;
  const matches = photographyHtml.match(navChipPattern) ?? [];
  assert.ok(matches.length > 0, 'Photography page should render at least one nav chip');
}

function assertCarouselControlAria(homeHtml, cfg) {
  const carouselCfg = cfg.home.featuredMedia.carousel;
  const hasMultipleSlides = Array.isArray(cfg.home.featuredMedia.items) && cfg.home.featuredMedia.items.length > 1;
  if (!carouselCfg.showNavigationArrows || !hasMultipleSlides) {
    return;
  }

  const prevAttrs = getStartTagAttrsByTestId(homeHtml, 'carousel-prev');
  const nextAttrs = getStartTagAttrsByTestId(homeHtml, 'carousel-next');

  assert.equal(getAttribute(prevAttrs, 'aria-label'), carouselCfg.prevButtonAriaLabel, 'Carousel prev aria-label should match config');
  assert.equal(getAttribute(nextAttrs, 'aria-label'), carouselCfg.nextButtonAriaLabel, 'Carousel next aria-label should match config');
}

function assertNoSourceModulePreload(homeHtml) {
  assert.doesNotMatch(
    homeHtml,
    /<link\b[^>]*\brel=(['"])modulepreload\1[^>]*\bhref=(['"])\/src\//i,
    'Home route should not preload source-file module paths; use built assets only'
  );
}

function main() {
  const cfg = readSiteConfig();
  const warnings = [];

  const htmlByRoute = {};
  for (const [route, fp] of ROUTE_HTML_FILES) {
    htmlByRoute[route] = readRouteHtml(fp);
  }

  const homeHtml = htmlByRoute['/'];
  const aboutHtml = htmlByRoute['/about/'];
  const photographyHtml = htmlByRoute['/photography/'];
  readStylesheetBundles(photographyHtml, '/photography/');

  assertHasTestId(homeHtml, 'home-editorial-hero');

  assertHasTestId(photographyHtml, 'photography-hero');
  assertHasTestId(photographyHtml, 'photography-page-title');

  collectHomeCtaClusterWarnings(homeHtml, cfg, warnings);
  assertPrimaryNavOrder(homeHtml, '/');
  assertPrimaryNavOrder(aboutHtml, '/about/');
  assertPrimaryNavOrder(photographyHtml, '/photography/');

  assertShellStyleOutput(homeHtml, '/', 'home');
  assertShellStyleOutput(aboutHtml, '/about/', 'about');
  assertShellStyleOutput(photographyHtml, '/photography/', 'photography');

  assertPhotographyPageCompleteness(photographyHtml);
  assertCarouselControlAria(homeHtml, cfg);
  assertCarouselHooks(homeHtml, cfg.home.featuredMedia.carousel);
  assertNoSourceModulePreload(homeHtml);

  const summary = {
    checkedRoutes: Array.from(ROUTE_HTML_FILES.keys()),
    warningCount: warnings.length,
    warnings,
  };
  console.warn(`SITE_CONTRACT_REPORT=${JSON.stringify(summary)}`);

  console.warn('Site output assertions passed for routes /, /about/, /photography/.');
}

main();

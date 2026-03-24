import Swiper from 'swiper';
import type { Swiper as SwiperInstance } from 'swiper';
import { EffectCoverflow, Keyboard, Navigation, Pagination } from 'swiper/modules';

const ROOT_SELECTOR = '.home-carousel';
const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const SWIPER_INIT_FLAG = 'swiperInitialized';

let reducedMotionQuery: MediaQueryList | null = null;
let reducedMotionListenerBound = false;

interface SwiperRoot extends HTMLElement {
  swiperApi?: SwiperInstance;
}

function getReducedMotionQuery(): MediaQueryList {
  if (!reducedMotionQuery) {
    reducedMotionQuery = window.matchMedia(REDUCED_MOTION_QUERY);
  }

  return reducedMotionQuery;
}

function prefersReducedMotion(): boolean {
  return getReducedMotionQuery().matches;
}

function hideSwipeHint(root: HTMLElement): void {
  if (root.querySelector('.swiper-swipe-hint')) {
    root.classList.add('swiper--interacted');
  }
}

function updateProgress(swiper: SwiperInstance, slideCount: number): void {
  const progressBar = swiper.el.querySelector<HTMLElement>('.swiper-progress-bar');

  if (!progressBar) {
    return;
  }

  const progress = ((swiper.activeIndex + 1) / slideCount) * 100;
  progressBar.style.width = `${progress}%`;
}

function getCounterPadLength(swiper: SwiperInstance): number {
  const raw = swiper.el.getAttribute('data-counter-pad-length');
  const parsed = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 2;
}

function updateCounter(swiper: SwiperInstance): void {
  // Support both legacy and current markup so loader behavior stays backward-compatible.
  const currentEl = swiper.el.querySelector<HTMLElement>('.count-current') ||
    swiper.el.querySelector<HTMLElement>('.swiper-counter-current');

  if (currentEl) {
    const padLength = getCounterPadLength(swiper);
    currentEl.textContent = (swiper.realIndex + 1).toString().padStart(padLength, '0');
  }

  const progressFill = swiper.el.querySelector<HTMLElement>('.indicator-progress-fill');
  if (progressFill) {
    const progress = ((swiper.realIndex + 1) / swiper.slides.length) * 100;
    progressFill.style.width = `${progress}%`;
  }
}

function updatePaginationAria(swiper: SwiperInstance): void {
  const bullets = swiper.el.querySelectorAll<HTMLElement>('.swiper-pagination-bullet');

  bullets.forEach((bullet, index) => {
    const isActive = index === swiper.activeIndex;
    bullet.setAttribute('aria-selected', isActive ? 'true' : 'false');
    bullet.setAttribute('tabindex', isActive ? '0' : '-1');
  });
}

function getCarouselRoots(): SwiperRoot[] {
  return Array.from(document.querySelectorAll(ROOT_SELECTOR)).filter(
    (root): root is SwiperRoot => root instanceof HTMLElement
  );
}

function getSlideCount(root: HTMLElement): number {
  const totalEl = root.querySelector('.swiper-counter-total');
  const parsed = Number.parseInt(totalEl?.textContent ?? '1', 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function getSpaceBetween(root: HTMLElement): number {
  const raw = root.getAttribute('data-space-between');
  const parsed = Number.parseFloat(raw ?? '');
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function getFirstOptionalHTMLElement(root: ParentNode, selectors: string[]): HTMLElement | null {
  for (const selector of selectors) {
    const el = root.querySelector(selector);
    if (el instanceof HTMLElement) {
      return el;
    }
  }

  return null;
}

function applyMotionSettings(swiper: SwiperInstance): void {
  const useReducedMotion = prefersReducedMotion();
  swiper.params.speed = useReducedMotion ? 0 : 600;
  swiper.params.effect = useReducedMotion ? 'slide' : 'coverflow';
}

function initSwiper(root: SwiperRoot, slideCount: number): void {
  if (root.dataset[SWIPER_INIT_FLAG] === 'true') {
    return;
  }

  const slides = root.querySelectorAll('.swiper-slide');
  if (slides.length === 0) {
    return;
  }

  // Accept both old/new control selectors during incremental component cleanup.
  const prevEl = getFirstOptionalHTMLElement(root, ['.nav-arrow--prev', '.swiper-nav-btn--prev']);
  const nextEl = getFirstOptionalHTMLElement(root, ['.nav-arrow--next', '.swiper-nav-btn--next']);
  const paginationEl = getFirstOptionalHTMLElement(root, ['.swiper-pagination']);
  const useReducedMotion = prefersReducedMotion();
  const spaceBetween = getSpaceBetween(root);

  const swiper = new Swiper(root, {
    modules: [Navigation, Pagination, EffectCoverflow, Keyboard],
    effect: useReducedMotion ? 'slide' : 'coverflow',
    coverflowEffect: {
      rotate: 0,
      stretch: 0,
      depth: 100,
      modifier: 2.5,
      slideShadows: true,
    },
    centeredSlides: true,
    slidesPerView: 'auto',
    spaceBetween,
    loop: true,
    speed: useReducedMotion ? 0 : 600,
    keyboard: {
      enabled: true,
      onlyInViewport: true,
    },
    navigation: {
      prevEl,
      nextEl,
    },
    pagination: {
      el: paginationEl,
      clickable: true,
      renderBullet(index: number, className: string): string {
        return `<button type="button" class="${className}" role="tab" aria-selected="${index === 0 ? 'true' : 'false'}" aria-label="Go to slide ${index + 1}" tabindex="${index === 0 ? '0' : '-1'}"></button>`;
      },
    },
    on: {
      init(_this: SwiperInstance) {
        root.dataset[SWIPER_INIT_FLAG] = 'true';
        root.classList.add('swiper--initialized');
        updateProgress(_this, slideCount);
        updateCounter(_this);
      },
      slideChange(_this: SwiperInstance) {
        hideSwipeHint(root);
        updateProgress(_this, slideCount);
        updateCounter(_this);
        updatePaginationAria(_this);
      },
      click() {
        hideSwipeHint(root);
      },
      touchStart() {
        hideSwipeHint(root);
      },
    },
  });

  root.swiperApi = swiper;
}

export function initFeaturedMediaCarousels(): void {
  const roots = getCarouselRoots();

  roots.forEach((root) => {
    initSwiper(root, getSlideCount(root));
  });
}

export function registerFeaturedMediaCarouselReducedMotion(): void {
  if (reducedMotionListenerBound) {
    return;
  }

  // Keep one media-query listener globally and fan updates to already-mounted instances.
  reducedMotionListenerBound = true;
  getReducedMotionQuery().addEventListener('change', () => {
    getCarouselRoots().forEach((root) => {
      if (root.swiperApi) {
        applyMotionSettings(root.swiperApi);
      }
    });
  });
}

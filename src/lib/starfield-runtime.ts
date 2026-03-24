import type { StarfieldEffectConfig } from './content-types';

const DPR_CAP = 2;
const IDLE_RESTART_TIME = 1000;
const STAR_POINTS = 5;

const starDensities = {
  low: 0.00005,
  medium: 0.0001,
  high: 0.0002,
  ultra: 0.0004,
};

type CellGrid = Record<string, Record<string, Star[]>>;

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  shape: 'circle' | 'star';
  speedX: number;
  speedY: number;
  rotation: number;
  rotationSpeed: number;
  depth: number;
  connects: boolean;
  originalX: number;
  originalY: number;
}

interface PointerState {
  x: number | null;
  y: number | null;
}

function parseHexColor(color: string): RgbColor {
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) {
    return { r: 255, g: 255, b: 255 };
  }

  return {
    r: parseInt(color.slice(1, 3), 16),
    g: parseInt(color.slice(3, 5), 16),
    b: parseInt(color.slice(5, 7), 16),
  };
}

function getOrCreateCell(cells: CellGrid, cellX: number, cellY: number): Star[] {
  const cellXKey = String(cellX);
  const cellYKey = String(cellY);

  if (!cells[cellXKey]) {
    cells[cellXKey] = {};
  }
  if (!cells[cellXKey][cellYKey]) {
    cells[cellXKey][cellYKey] = [];
  }

  return cells[cellXKey][cellYKey];
}

function addStarToCellGrid(cells: CellGrid, star: Star, cellSize: number): void {
  const cellX = Math.floor(star.x / cellSize);
  const cellY = Math.floor(star.y / cellSize);
  getOrCreateCell(cells, cellX, cellY).push(star);
}

function calculateDistance(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

export function initStarfield(
  backgroundCanvas: HTMLCanvasElement,
  starsCanvas: HTMLCanvasElement,
  config: StarfieldEffectConfig,
): () => void {
  if (!config.enabled) {
    backgroundCanvas.style.display = 'none';
    starsCanvas.style.display = 'none';
    return () => {};
  }

  const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (reduceMotionQuery.matches) {
    backgroundCanvas.style.display = 'none';
    starsCanvas.style.display = 'none';
    return () => {};
  }

  const ctxBg = backgroundCanvas.getContext('2d');
  const ctxSt = starsCanvas.getContext('2d');

  if (!ctxBg || !ctxSt) {
    backgroundCanvas.style.display = 'none';
    starsCanvas.style.display = 'none';
    return () => {};
  }

  const handleTouchStart = (event: TouchEvent) => {
    const touch = event.touches[0];
    if (touch) setPointerPosition(touch.clientX, touch.clientY);
  };
  const handleTouchMove = (event: TouchEvent) => {
    const touch = event.touches[0];
    if (touch) setPointerPosition(touch.clientX, touch.clientY);
  };

  const stars: Star[] = [];
  const pointer: PointerState = { x: null, y: null };
  const starRgb = parseHexColor(config.starColor);
  let cells: CellGrid = {};
  let rafId = 0;
  let idleTimeoutId: ReturnType<typeof setTimeout> | null = null;
  let width = 0;
  let height = 0;
  const cellSize = config.maxDistance;
  let isVisible = true;

  function randomRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }

  function createStar(x: number, y: number): Star {
    const size = randomRange(config.starSize.min, config.starSize.max);
    const shape = config.starShapes[Math.floor(Math.random() * config.starShapes.length)] as 'circle' | 'star';
    const speedX = (Math.random() - 0.5) * config.speedFactor;
    const speedY = (Math.random() - 0.5) * config.speedFactor;
    const rotationSpeed = randomRange(config.rotationSpeed.min, config.rotationSpeed.max);
    const depth = Math.random();
    const connects = config.percentStarsConnecting === 100
      ? true
      : config.connectionsWhenNoMouse && Math.random() < config.percentStarsConnecting / 100;

    return {
      x,
      y,
      size: size * depth,
      shape,
      speedX,
      speedY,
      rotation: 0,
      rotationSpeed,
      depth,
      connects,
      originalX: x,
      originalY: y,
    };
  }

  function resizeCanvas(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    width = window.innerWidth;
    height = window.innerHeight;

    backgroundCanvas.width = Math.floor(width * dpr);
    backgroundCanvas.height = Math.floor(height * dpr);
    backgroundCanvas.style.width = `${width}px`;
    backgroundCanvas.style.height = `${height}px`;

    starsCanvas.width = Math.floor(width * dpr);
    starsCanvas.height = Math.floor(height * dpr);
    starsCanvas.style.width = `${width}px`;
    starsCanvas.style.height = `${height}px`;

    ctxBg!.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctxSt!.setTransform(dpr, 0, 0, dpr, 0, 0);

    drawBackground();
  }

  function drawBackground(): void {
    ctxBg!.clearRect(0, 0, width, height);

    if (config.canvasGradient && config.canvasGradient.length > 0) {
      const gradient = ctxBg!.createLinearGradient(0, 0, width, height);
      config.canvasGradient.forEach((color, index) => {
        gradient.addColorStop(index / (config.canvasGradient!.length - 1), color);
      });
      ctxBg!.fillStyle = gradient;
      ctxBg!.fillRect(0, 0, width, height);
    }
  }

  function createStars(): void {
    stars.length = 0;
    cells = {};

    const numberOfStars = starDensities[config.starDensity] * width * height;

    for (let i = 0; i < numberOfStars; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const star = createStar(x, y);
      stars.push(star);
      addStarToCellGrid(cells, star, cellSize);
    }
  }

  function updateStarPositionForParallax(): void {
    if (!config.parallaxEffect || pointer.x === null || pointer.y === null) return;

    stars.forEach((star) => {
      const dx = (width / 2 - pointer.x!) / config.parallaxStrength;
      const dy = (height / 2 - pointer.y!) / config.parallaxStrength;
      star.x = star.originalX + dx * (1 - star.depth);
      star.y = star.originalY + dy * (1 - star.depth);
    });
  }

  function drawStar(star: Star): void {
    ctxSt!.beginPath();
    ctxSt!.fillStyle = config.starColor;
    ctxSt!.globalAlpha = config.starOpacity;

    switch (star.shape) {
      case 'circle':
        ctxSt!.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        break;
      case 'star':
        ctxSt!.save();
        ctxSt!.translate(star.x, star.y);
        ctxSt!.rotate(star.rotation);
        ctxSt!.beginPath();
        for (let i = 0; i < STAR_POINTS; i++) {
          ctxSt!.lineTo(0, -star.size / 2);
          ctxSt!.translate(0, -star.size / 2);
          ctxSt!.rotate((Math.PI * 2) / 10);
          ctxSt!.lineTo(0, -star.size / 2);
          ctxSt!.translate(0, -star.size / 2);
          ctxSt!.rotate(-((Math.PI * 6) / 10));
        }
        ctxSt!.lineTo(0, -star.size / 2);
        ctxSt!.restore();
        break;
    }

    ctxSt!.closePath();
    ctxSt!.fill();
    ctxSt!.globalAlpha = 1;
  }

  function drawConnections(star: Star): void {
    const cellX = Math.floor(star.x / cellSize);
    const cellY = Math.floor(star.y / cellSize);

    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const neighbourCell = cells[String(cellX + i)]?.[String(cellY + j)];
        if (!neighbourCell) {
          continue;
        }

        neighbourCell.forEach((otherStar) => {
          if (otherStar === star) {
            return;
          }

          const distance = calculateDistance(star.x, star.y, otherStar.x, otherStar.y);
          let pointerDistance = Infinity;

          if (pointer.x !== null && pointer.y !== null) {
            pointerDistance = calculateDistance(star.x, star.y, pointer.x, pointer.y);
          }

          if (
            distance < config.maxDistance
            && (pointerDistance < config.mouseRadius || (star.connects && otherStar.connects))
          ) {
            ctxSt!.beginPath();
            ctxSt!.moveTo(star.x, star.y);
            ctxSt!.lineTo(otherStar.x, otherStar.y);

            const opacity = ((config.maxDistance - distance) / config.maxDistance) * config.linkOpacity;
            ctxSt!.strokeStyle = `rgba(${starRgb.r}, ${starRgb.g}, ${starRgb.b}, ${opacity})`;
            ctxSt!.lineWidth = config.lineThickness;
            ctxSt!.stroke();
          }
        });
      }
    }
  }

  function updateStar(star: Star): void {
    star.x += star.speedX;
    star.y += star.speedY;

    if (star.shape === 'star') {
      star.rotation += star.rotationSpeed;
    }

    if (star.x > width || star.x < 0) {
      star.speedX = -star.speedX;
    }
    if (star.y > height || star.y < 0) {
      star.speedY = -star.speedY;
    }
  }

  function animateStars(): void {
    if (!isVisible) return;

    updateStarPositionForParallax();
    ctxSt!.clearRect(0, 0, width, height);

    cells = {};

    stars.forEach((star) => {
      updateStar(star);

      drawStar(star);
      addStarToCellGrid(cells, star, cellSize);
      drawConnections(star);
    });

    rafId = requestAnimationFrame(animateStars);
  }

  function setPointerPosition(clientX: number, clientY: number): void {
    pointer.x = clientX;
    pointer.y = clientY;

    if (idleTimeoutId) {
      clearTimeout(idleTimeoutId);
    }

    idleTimeoutId = setTimeout(() => {
      pointer.x = null;
      pointer.y = null;
    }, IDLE_RESTART_TIME);
  }

  function releasePointer(): void {
    pointer.x = null;
    pointer.y = null;
  }

  function handleVisibilityChange(): void {
    isVisible = !document.hidden;
    if (isVisible && !rafId) {
      rafId = requestAnimationFrame(animateStars);
    } else if (!isVisible && rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  function handleResize(): void {
    stars.length = 0;
    cells = {};
    resizeCanvas();
    createStars();
  }

  resizeCanvas();
  createStars();
  rafId = requestAnimationFrame(animateStars);

  const handleMouseMove = (event: MouseEvent) => setPointerPosition(event.clientX, event.clientY);

  window.addEventListener('resize', handleResize);
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseleave', releasePointer);
  window.addEventListener('touchstart', handleTouchStart as EventListener);
  window.addEventListener('touchmove', handleTouchMove as EventListener);
  window.addEventListener('touchend', releasePointer);
  document.addEventListener('visibilitychange', handleVisibilityChange);

  return () => {
    if (rafId) {
      cancelAnimationFrame(rafId);
    }
    if (idleTimeoutId) {
      clearTimeout(idleTimeoutId);
    }
    window.removeEventListener('resize', handleResize);
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseleave', releasePointer);
    window.removeEventListener('touchstart', handleTouchStart as EventListener);
    window.removeEventListener('touchmove', handleTouchMove as EventListener);
    window.removeEventListener('touchend', releasePointer);
    document.removeEventListener('visibilitychange', handleVisibilityChange);
  };
}

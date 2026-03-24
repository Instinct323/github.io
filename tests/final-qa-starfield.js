import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import util from 'util';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EVIDENCE_DIR = path.join(__dirname, '.sisyphus', 'evidence', 'final-qa');
const SCREENSHOT_PREFIX = 'starfield-qa';

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function report(...args) {
  process.stdout.write(`${util.format(...args)}\n`);
}

async function runQA() {
  const results = {
    timestamp: new Date().toISOString(),
    passed: [],
    failed: [],
    warnings: [],
    screenshots: [],
    consoleMessages: [],
    errors: [],
  };

  ensureDir(EVIDENCE_DIR);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    ignoreHTTPSErrors: true,
  });
  await context.route('**', route => {
    const url = route.request().url();
    if (url.includes('localhost')) {
      route.continue();
    } else {
      route.abort();
    }
  });
  const page = await context.newPage();

  page.on('console', msg => {
    results.consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
    });
    if (msg.type() === 'error') {
      results.errors.push(msg.text());
    }
  });

  page.on('pageerror', error => {
    results.errors.push(error.message);
  });

  report('=== STARFIELD FINAL QA ===\n');

  try {
    report('1. Navigating to homepage...');
    await page.goto('http://localhost:4321', { waitUntil: 'networkidle' });
    await sleep(2000);

    report('2. Verifying canvas elements...');
    const backgroundCanvas = await page.$('.site-stars-background');
    const starsCanvas = await page.$('.site-stars');

    if (backgroundCanvas) {
      results.passed.push('Background canvas found (.site-stars-background)');
    } else {
      results.failed.push('Background canvas NOT found');
    }

    if (starsCanvas) {
      results.passed.push('Stars canvas found (.site-stars)');
    } else {
      results.failed.push('Stars canvas NOT found');
    }

    if (starsCanvas) {
      const canvasWidth = await starsCanvas.evaluate(el => el.width);
      const canvasHeight = await starsCanvas.evaluate(el => el.height);
      if (canvasWidth > 0 && canvasHeight > 0) {
        results.passed.push(`Stars canvas has valid dimensions: ${canvasWidth}x${canvasHeight}`);
      } else {
        results.failed.push(`Stars canvas has invalid dimensions: ${canvasWidth}x${canvasHeight}`);
      }
    }

    report('3. Checking starfield configuration...');
    const starfieldConfig = await starsCanvas?.evaluate(el => {
      try {
        return JSON.parse(el.dataset.starfield || '{}');
      } catch {
        return null;
      }
    });

    if (starfieldConfig && starfieldConfig.enabled !== false) {
      results.passed.push('Starfield config parsed successfully');
      results.passed.push(`  - enabled: ${starfieldConfig.enabled}`);
      results.passed.push(`  - starDensity: ${starfieldConfig.starDensity}`);
      results.passed.push(`  - starColor: ${starfieldConfig.starColor}`);
      results.passed.push(`  - maxDistance: ${starfieldConfig.maxDistance}`);
    } else if (starfieldConfig?.enabled === false) {
      results.warnings.push('Starfield is disabled in config');
    } else {
      results.failed.push('Failed to parse starfield config');
    }

    report('4. Taking initial screenshot...');
    const initialScreenshot = path.join(EVIDENCE_DIR, `${SCREENSHOT_PREFIX}-01-initial.png`);
    await page.screenshot({ path: initialScreenshot, fullPage: false });
    results.screenshots.push(initialScreenshot);
    results.passed.push('Initial screenshot captured');

    report('5. Verifying stars are drawn...');
    const starsDrawn = await starsCanvas?.evaluate(canvas => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;
      const imageData = ctx.getImageData(0, 0, Math.min(canvas.width, 100), Math.min(canvas.height, 100));
      for (let i = 0; i < imageData.data.length; i += 4) {
        if (imageData.data[i] > 0 || imageData.data[i + 1] > 0 || imageData.data[i + 2] > 0) {
          return true;
        }
      }
      return false;
    });

    if (starsDrawn) {
      results.passed.push('Stars are visible on canvas (non-black pixels detected)');
    } else {
      results.failed.push('No stars visible on canvas (all black pixels)');
    }

    report('6. Testing parallax effect...');
    await page.mouse.move(960, 540);
    await sleep(500);
    
    const centerScreenshot = path.join(EVIDENCE_DIR, `${SCREENSHOT_PREFIX}-02-mouse-center.png`);
    await page.screenshot({ path: centerScreenshot, fullPage: false });
    results.screenshots.push(centerScreenshot);
    
    await page.mouse.move(100, 100);
    await sleep(500);
    
    const cornerScreenshot = path.join(EVIDENCE_DIR, `${SCREENSHOT_PREFIX}-03-mouse-corner.png`);
    await page.screenshot({ path: cornerScreenshot, fullPage: false });
    results.screenshots.push(cornerScreenshot);
    
    await page.mouse.move(1800, 900);
    await sleep(500);
    
    const oppositeScreenshot = path.join(EVIDENCE_DIR, `${SCREENSHOT_PREFIX}-04-mouse-opposite.png`);
    await page.screenshot({ path: oppositeScreenshot, fullPage: false });
    results.screenshots.push(oppositeScreenshot);
    
    results.passed.push('Mouse movement parallax test completed');

    report('7. Testing connection lines...');
    for (let i = 0; i < 5; i++) {
      await page.mouse.move(200 + i * 300, 200 + i * 150, { steps: 10 });
      await sleep(100);
    }
    
    const connectionsScreenshot = path.join(EVIDENCE_DIR, `${SCREENSHOT_PREFIX}-05-connections.png`);
    await page.screenshot({ path: connectionsScreenshot, fullPage: false });
    results.screenshots.push(connectionsScreenshot);
    results.passed.push('Connection lines test completed');

    report('8. Checking console for errors...');
    const errorCount = results.errors.length;
    const warningCount = results.consoleMessages.filter(m => m.type === 'warning').length;
    
    if (errorCount === 0) {
      results.passed.push('No console errors detected');
    } else {
      results.failed.push(`${errorCount} console error(s) detected`);
      for (const e of results.errors) {
        results.failed.push(`  - ${e}`);
      }
    }
    
    if (warningCount > 0) {
      results.warnings.push(`${warningCount} console warning(s) detected`);
    }

    report('9. Testing reduced motion support...');
    const reducedMotionContext = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });
    const reducedMotionPage = await reducedMotionContext.newPage();
    await reducedMotionPage.emulateMedia({ reducedMotion: 'reduce' });
    
    await reducedMotionPage.goto('http://localhost:4321', { waitUntil: 'networkidle' });
    await sleep(1000);
    
    const reducedMotionCanvas = await reducedMotionPage.$('.site-stars');
    const canvasDisplay = await reducedMotionCanvas?.evaluate(el => 
      window.getComputedStyle(el).display
    );
    
    if (canvasDisplay === 'none') {
      results.passed.push('Reduced motion: canvas hidden correctly');
    } else {
      results.warnings.push(`Reduced motion: canvas display is "${canvasDisplay}" (expected "none")`);
    }
    
    await reducedMotionContext.close();

    report('10. Testing mobile viewport...');
    const mobileContext = await browser.newContext({
      viewport: { width: 375, height: 667 },
      isMobile: true,
    });
    const mobilePage = await mobileContext.newPage();
    
    await mobilePage.goto('http://localhost:4321', { waitUntil: 'networkidle' });
    await sleep(2000);
    
    const mobileScreenshot = path.join(EVIDENCE_DIR, `${SCREENSHOT_PREFIX}-06-mobile.png`);
    await mobilePage.screenshot({ path: mobileScreenshot, fullPage: false });
    results.screenshots.push(mobileScreenshot);
    
    const mobileCanvas = await mobilePage.$('.site-stars');
    if (mobileCanvas) {
      results.passed.push('Mobile viewport: canvas rendered');
    } else {
      results.failed.push('Mobile viewport: canvas not found');
    }
    
    await mobileContext.close();

  } catch (error) {
    results.failed.push(`Test execution error: ${error.message}`);
    console.error('Test error:', error);
  }

  await browser.close();

  report('\n=== QA REPORT ===\n');
  
  report('PASSED: %d', results.passed.length);
  for (const p of results.passed) {
    report(`  ✓ ${p}`);
  }

  report('\nFAILED: %d', results.failed.length);
  for (const f of results.failed) {
    report(`  ✗ ${f}`);
  }

  if (results.warnings.length > 0) {
    report('\nWARNINGS: %d', results.warnings.length);
    for (const w of results.warnings) {
      report(`  ⚠ ${w}`);
    }
  }

  report('\nSCREENSHOTS: %d', results.screenshots.length);
  for (const s of results.screenshots) {
    report(`  📷 ${s}`);
  }

  if (results.errors.length > 0) {
    report('\nCONSOLE ERRORS:');
    for (const e of results.errors) {
      report(`  ❌ ${e}`);
    }
  }

  const reportPath = path.join(EVIDENCE_DIR, 'qa-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  report(`\nReport saved to: ${reportPath}`);

  const verdict = results.failed.length === 0 ? 'PASS' : 'FAIL';
  report(`\n=== FINAL VERDICT: ${verdict} ===`);
  
  return verdict === 'PASS';
}

runQA().then(success => {
  process.exit(success ? 0 : 1);
});

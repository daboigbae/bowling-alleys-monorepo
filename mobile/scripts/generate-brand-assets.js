#!/usr/bin/env node
'use strict';

/**
 * BAIO Brand Asset Generator
 *
 * Produces two PNGs from the BAIO SVG logo:
 *   1. icon.png     — 1024×1024, logo on white (#FFFFFF), no alpha
 *   2. splash.png   — 1242×2688, logo at 40% width centered at 45% vertical on beige (#E7E1D4)
 *
 * Run from the mobile/ directory:
 *   node scripts/generate-brand-assets.js
 *
 * Requires: sharp (devDependency)
 */

const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// ── Paths ─────────────────────────────────────────────────────────────────────

// From mobile/scripts/ → up two levels to monorepo root → frontend/app/icon.svg
const SVG_SOURCE = path.resolve(__dirname, '..', '..', 'frontend', 'app', 'icon.svg');
const OUTPUT_DIR = path.resolve(__dirname, '..', 'assets', 'images');

// ── Dimensions ────────────────────────────────────────────────────────────────

const ICON_SIZE = 1024;

const SPLASH_WIDTH = 1242;
const SPLASH_HEIGHT = 2688;
// Logo width: 40% of canvas width (design note §1 grid + spec AC)
const LOGO_WIDTH = Math.round(SPLASH_WIDTH * 0.4); // 497px
// Logo height: 1:1 aspect ratio (SVG source is square)
const LOGO_HEIGHT = LOGO_WIDTH;
// Vertical placement: center of logo at 45% from top (spec AC — "visually above dead center")
const LOGO_TOP = Math.round(SPLASH_HEIGHT * 0.45 - LOGO_HEIGHT / 2);
const LOGO_LEFT = Math.round((SPLASH_WIDTH - LOGO_WIDTH) / 2);

// ── Background colors ─────────────────────────────────────────────────────────

const WHITE = { r: 255, g: 255, b: 255 };
const BEIGE = { r: 0xe7, g: 0xe1, b: 0xd4 }; // #E7E1D4

// ── Helpers ───────────────────────────────────────────────────────────────────

function assertFileExists(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required file not found: ${filePath}`);
  }
}

async function verifyOutput(filePath, expectedWidth, expectedHeight) {
  const meta = await sharp(filePath).metadata();
  if (!meta.width || !meta.height) {
    throw new Error(`Output file appears blank or malformed: ${filePath}`);
  }
  if (meta.width !== expectedWidth || meta.height !== expectedHeight) {
    throw new Error(
      `Dimension mismatch for ${path.basename(filePath)}: ` +
        `expected ${expectedWidth}×${expectedHeight}, got ${meta.width}×${meta.height}`
    );
  }
  if (meta.channels === 4) {
    // Alpha channel present — should not happen after flatten()
    console.warn(`  ⚠️  Alpha channel detected in ${path.basename(filePath)} — verify no transparency`);
  }
}

// ── icon.png ─────────────────────────────────────────────────────────────────

async function generateIcon() {
  const iconPath = path.join(OUTPUT_DIR, 'icon.png');

  console.log(`  Rendering SVG at ${ICON_SIZE}×${ICON_SIZE}...`);

  // Render SVG at 1024×1024. flatten() removes alpha and composites over white.
  await sharp(SVG_SOURCE)
    .resize(ICON_SIZE, ICON_SIZE, { fit: 'contain', background: WHITE })
    .flatten({ background: WHITE })
    .png({ compressionLevel: 9 })
    .toFile(iconPath);

  await verifyOutput(iconPath, ICON_SIZE, ICON_SIZE);
  console.log(`  ✓ icon.png — ${ICON_SIZE}×${ICON_SIZE}px, white background, no transparency`);
}

// ── splash.png ────────────────────────────────────────────────────────────────

async function generateSplash() {
  const splashPath = path.join(OUTPUT_DIR, 'splash.png');

  console.log(`  Rendering logo at ${LOGO_WIDTH}×${LOGO_HEIGHT} (40% of ${SPLASH_WIDTH}px canvas)...`);
  console.log(`  Placement: left=${LOGO_LEFT}px, top=${LOGO_TOP}px (center at 45% vertical)`);

  // Render logo at target size, flattened over beige so transparent SVG regions
  // match the splash background — no white halo.
  const logoBuffer = await sharp(SVG_SOURCE)
    .resize(LOGO_WIDTH, LOGO_HEIGHT, { fit: 'contain', background: BEIGE })
    .flatten({ background: BEIGE })
    .png()
    .toBuffer();

  // Two-pass composite:
  // Pass 1 — create beige canvas and composite the logo to a buffer.
  // Pass 2 — flatten() strips any residual alpha (sharp re-introduces RGBA after composite).
  // iOS rejects transparent splash images (edge case from spec).
  const compositeBuffer = await sharp({
    create: {
      width: SPLASH_WIDTH,
      height: SPLASH_HEIGHT,
      channels: 4,
      background: { ...BEIGE, alpha: 1 },
    },
  })
    .composite([{ input: logoBuffer, top: LOGO_TOP, left: LOGO_LEFT }])
    .png()
    .toBuffer();

  await sharp(compositeBuffer)
    .flatten({ background: BEIGE })
    .png({ compressionLevel: 9 })
    .toFile(splashPath);

  await verifyOutput(splashPath, SPLASH_WIDTH, SPLASH_HEIGHT);
  console.log(`  ✓ splash.png — ${SPLASH_WIDTH}×${SPLASH_HEIGHT}px, beige background (#E7E1D4), no transparency`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('BAIO Brand Asset Generator');
  console.log('─'.repeat(40));

  // Verify SVG source exists
  assertFileExists(SVG_SOURCE);
  console.log(`  SVG source: ${SVG_SOURCE}`);

  // Ensure output directory exists (edge case: .gitkeep is present but dir should already exist)
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`  Output dir: ${OUTPUT_DIR}`);
  console.log('');

  console.log('Generating icon.png...');
  await generateIcon();
  console.log('');

  console.log('Generating splash.png...');
  await generateSplash();
  console.log('');

  console.log('─'.repeat(40));
  console.log('All assets generated successfully.');
  console.log('');
  console.log('Next steps:');
  console.log('  1. Verify icon and splash look correct');
  console.log('  2. rm -rf ios/  (Rule 21 — app.json changed)');
  console.log('  3. npx expo run:ios');
}

main().catch((err) => {
  console.error('\n✗ Asset generation failed:', err.message);
  console.error('');
  console.error('If the error is SVG-related, ensure sharp was built with librsvg support:');
  console.error('  npm rebuild sharp');
  console.error('  or: brew install librsvg && npm rebuild sharp');
  process.exit(1);
});

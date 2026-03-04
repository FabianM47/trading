/**
 * Icon-Generator für PWA (aus PNG-Quelldatei)
 * Generiert alle benötigten Icon-Größen aus dem App-Logo
 * 
 * Usage: node scripts/generate-icons-from-png.js
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const sourcePath = path.join(__dirname, '..', 'public', 'app-icon.png');
const outputDir = path.join(__dirname, '..', 'public', 'icons');
const publicDir = path.join(__dirname, '..', 'public');

if (!fs.existsSync(sourcePath)) {
  console.error('❌ Quelldatei nicht gefunden:', sourcePath);
  console.error('   Bitte lege das App-Icon als public/app-icon.png ab.');
  process.exit(1);
}

// Sicherstellen, dass der Output-Ordner existiert
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function generateIcons() {
  const sourceBuffer = fs.readFileSync(sourcePath);
  const metadata = await sharp(sourceBuffer).metadata();
  console.log(`📷 Quelldatei: ${metadata.width}x${metadata.height} ${metadata.format}`);

  // PWA Icons
  const pwaIcons = [
    { size: 72, name: 'icon-72x72.png' },
    { size: 96, name: 'icon-96x96.png' },
    { size: 128, name: 'icon-128x128.png' },
    { size: 144, name: 'icon-144x144.png' },
    { size: 152, name: 'icon-152x152.png' },
    { size: 192, name: 'icon-192x192.png' },
    { size: 384, name: 'icon-384x384.png' },
    { size: 512, name: 'icon-512x512.png' },
  ];

  for (const icon of pwaIcons) {
    const outputPath = path.join(outputDir, icon.name);
    await sharp(sourceBuffer)
      .resize(icon.size, icon.size, { fit: 'contain', background: { r: 10, g: 10, b: 10, alpha: 1 } })
      .png()
      .toFile(outputPath);
    console.log(`✅ ${icon.name} (${icon.size}x${icon.size})`);
  }

  // Apple Touch Icon (180x180)
  const applePath = path.join(outputDir, 'apple-touch-icon.png');
  await sharp(sourceBuffer)
    .resize(180, 180, { fit: 'contain', background: { r: 10, g: 10, b: 10, alpha: 1 } })
    .png()
    .toFile(applePath);
  console.log(`✅ apple-touch-icon.png (180x180)`);

  // Favicon als PNG (32x32) für Browser-Tabs
  const faviconPath = path.join(publicDir, 'favicon.png');
  await sharp(sourceBuffer)
    .resize(32, 32, { fit: 'contain', background: { r: 10, g: 10, b: 10, alpha: 1 } })
    .png()
    .toFile(faviconPath);
  console.log(`✅ favicon.png (32x32)`);

  // Favicon ICO-Alternative (48x48 PNG)
  const favicon48Path = path.join(publicDir, 'favicon-48.png');
  await sharp(sourceBuffer)
    .resize(48, 48, { fit: 'contain', background: { r: 10, g: 10, b: 10, alpha: 1 } })
    .png()
    .toFile(favicon48Path);
  console.log(`✅ favicon-48.png (48x48)`);

  console.log('\n🎉 Alle Icons erfolgreich generiert!');
  console.log('   Vergiss nicht, layout.tsx zu prüfen falls du das Favicon-Format änderst.');
}

generateIcons().catch(console.error);

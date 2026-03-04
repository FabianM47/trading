/**
 * Icon-Generator für PWA
 * Generiert PNG-Icons aus dem SVG Favicon mit sharp
 * 
 * Usage: node scripts/generate-pwa-icons.js
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const svgPath = path.join(__dirname, '..', 'public', 'favicon.svg');
const outputDir = path.join(__dirname, '..', 'public', 'icons');

// Sicherstellen, dass der Output-Ordner existiert
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const sizes = [192, 512];

async function generateIcons() {
  const svgBuffer = fs.readFileSync(svgPath);
  
  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    console.log(`✅ Generated ${outputPath}`);
  }
  
  // Apple Touch Icon (180x180)
  const applePath = path.join(outputDir, 'apple-touch-icon.png');
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(applePath);
  console.log(`✅ Generated ${applePath}`);
  
  console.log('\n🎉 Alle PWA-Icons erfolgreich generiert!');
}

generateIcons().catch(console.error);

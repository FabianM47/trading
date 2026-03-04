/**
 * Icon-Generator für PWA
 * Generiert PNG-Icons aus dem SVG Favicon
 * 
 * Usage: node scripts/generate-icons.js
 * 
 * Benötigt: keine externen Dependencies (nutzt Canvas API via Node)
 * 
 * Alternativ manuell: Lade favicon.svg in einen Online-Konverter hoch
 * und generiere PNGs in 192x192 und 512x512.
 */

const fs = require('fs');
const path = require('path');

// SVG als Data-URL für einfache Verwendung
const svgContent = fs.readFileSync(path.join(__dirname, '..', 'public', 'favicon.svg'), 'utf8');

// Generiere einfache PNG-Platzhalter mit dem "T" Logo
// Da Node.js keine Canvas API hat, erstellen wir minimale PNGs
// Für Production sollten echte PNGs aus dem SVG generiert werden

const sizes = [192, 512];

sizes.forEach(size => {
  // Erstelle ein minimales SVG in der richtigen Größe als Fallback
  const scaledSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <rect fill="#3b82f6" width="${size}" height="${size}" rx="${Math.round(size * 0.15)}"/>
  <text x="${size/2}" y="${size/2}" font-size="${Math.round(size * 0.6)}" text-anchor="middle" alignment-baseline="central" fill="white" font-family="Arial, sans-serif" font-weight="bold">T</text>
</svg>`;
  
  const outputPath = path.join(__dirname, '..', 'public', 'icons', `icon-${size}x${size}.svg`);
  fs.writeFileSync(outputPath, scaledSvg);
  console.log(`✅ Generated ${outputPath}`);
});

console.log('\n⚠️  SVG-Icons als Platzhalter generiert.');
console.log('Für Production: Konvertiere die SVGs zu PNGs mit:');
console.log('  - https://cloudconvert.com/svg-to-png');
console.log('  - oder: npx sharp-cli -i public/icons/icon-192x192.svg -o public/icons/icon-192x192.png resize 192 192');

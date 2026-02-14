import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return "";
  return fs.readFileSync(filePath, "utf8");
}

function parseKeysFromEnvExample(envText) {
  // Nimmt Zeilen wie FOO=bar oder FOO= und ignoriert Kommentare
  return envText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split("=")[0].trim())
    .filter(Boolean);
}

function parseKeysFromDotEnv(envText) {
  return envText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => l.split("=")[0].trim())
    .filter(Boolean);
}

const envExamplePath = path.join(root, ".env.example");
const envLocalPath = path.join(root, ".env.local");

const envExample = readEnvFile(envExamplePath);
if (!envExample) {
  console.error("❌ .env.example nicht gefunden. Bitte erstellen (als Referenz der benötigten Variablen).");
  process.exit(1);
}

const requiredKeys = Array.from(new Set(parseKeysFromEnvExample(envExample)));

const envLocal = readEnvFile(envLocalPath);
if (!envLocal) {
  console.error("❌ .env.local nicht gefunden. Bitte anlegen und Variablen setzen.");
  console.error("   Tipp: Kopieren Sie .env.example nach .env.local und füllen Sie Werte ein.");
  process.exit(1);
}

const presentKeys = new Set(parseKeysFromDotEnv(envLocal));

// Prüft nur auf Präsenz in .env.local, nicht auf konkrete Werte (außer leere Werte)
const missing = [];
const empty = [];

for (const key of requiredKeys) {
  if (!presentKeys.has(key)) missing.push(key);
  else {
    // grob prüfen ob leer (KEY= oder KEY="")
    const match = envLocal.match(new RegExp(`^${key}\\s*=\\s*(.*)$`, "m"));
    if (match) {
      const raw = match[1].trim();
      const normalized = raw.replace(/^["']|["']$/g, "");
      if (!normalized) empty.push(key);
    }
  }
}

if (missing.length || empty.length) {
  console.error("❌ ENV Check fehlgeschlagen.");
  if (missing.length) {
    console.error("\nFehlende Keys in .env.local:");
    for (const k of missing) console.error(`  - ${k}`);
  }
  if (empty.length) {
    console.error("\nLeere Werte in .env.local:");
    for (const k of empty) console.error(`  - ${k}`);
  }
  process.exit(1);
}

console.log("✅ ENV Check OK. Alle Keys aus .env.example sind in .env.local vorhanden und nicht leer.");

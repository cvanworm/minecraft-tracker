import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputPath = path.resolve(__dirname, '../minecraft_all_items_checklist.md');
const outputPath = path.resolve(__dirname, '../src/data/itemsData.js');

if (!fs.existsSync(inputPath)) {
  console.error(`Error: Checklist file not found at ${inputPath}`);
  process.exit(1);
}

const fileContent = fs.readFileSync(inputPath, 'utf-8');
const lines = fileContent.split(/\r?\n/);

const items = [];
const categories = [];
let currentCategory = null;

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const seenIds = new Map();

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();

  if (line.startsWith('## ')) {
    currentCategory = line.slice(3).trim();
    if (!categories.includes(currentCategory)) {
      categories.push(currentCategory);
    }
  } else if (line.startsWith('* [ ]')) {
    const match = line.match(/^\* \[ \] (.*?) `\[(.*?)\]`$/);
    if (match) {
      const [, name, rarity] = match;
      let id = slugify(name);

      // In the rare event of ID collision across different categories
      if (seenIds.has(id)) {
        console.warn(`Duplicate item name/ID detected: "${name}" (${id}). Disambiguating.`);
        id = `${id}_${slugify(currentCategory).slice(0, 10)}`;
      }
      seenIds.set(id, name);

      items.push({
        id,
        name: name.trim(),
        category: currentCategory,
        rarity: rarity.trim(),
      });
    }
  }
}

const jsContent = `// Auto-generated from minecraft_all_items_checklist.md
// Run "npm run update-items" to refresh this file whenever you add or edit items.
// Total Items: ${items.length} across ${categories.length} categories.

export const RARITIES = ["Common", "Uncommon", "Rare", "Epic", "Legendary"];

export const RARITY_COLORS = {
  Common: {
    badge: "bg-[#2b2b2b] text-white border-[#ffffff]/40",
    border: "border-[#3f3f3f] hover:border-[#ffffff]",
    glow: "hover:shadow-[0_0_10px_rgba(255,255,255,0.2)]",
    accent: "#ffffff",
    dot: "bg-white",
    text: "text-white"
  },
  Uncommon: {
    badge: "bg-[#2d2c08] text-[#ffff55] border-[#ffff55]/50",
    border: "border-[#4d4c14] hover:border-[#ffff55]",
    glow: "hover:shadow-[0_0_10px_rgba(255,255,85,0.25)]",
    accent: "#ffff55",
    dot: "bg-[#ffff55]",
    text: "text-[#ffff55]"
  },
  Rare: {
    badge: "bg-[#082a2d] text-[#55ffff] border-[#55ffff]/50",
    border: "border-[#14494d] hover:border-[#55ffff]",
    glow: "hover:shadow-[0_0_10px_rgba(85,255,255,0.25)]",
    accent: "#55ffff",
    dot: "bg-[#55ffff]",
    text: "text-[#55ffff]"
  },
  Epic: {
    badge: "bg-[#2d082d] text-[#ff55ff] border-[#ff55ff]/50",
    border: "border-[#4d144d] hover:border-[#ff55ff]",
    glow: "hover:shadow-[0_0_10px_rgba(255,85,255,0.25)]",
    accent: "#ff55ff",
    dot: "bg-[#ff55ff]",
    text: "text-[#ff55ff]"
  },
  Legendary: {
    badge: "bg-[#2d1e08] text-[#ffaa00] border-[#ffaa00]/50",
    border: "border-[#4d3614] hover:border-[#ffaa00]",
    glow: "hover:shadow-[0_0_10px_rgba(255,170,0,0.3)]",
    accent: "#ffaa00",
    dot: "bg-[#ffaa00]",
    text: "text-[#ffaa00]"
  }
};

export const CATEGORIES = ${JSON.stringify(categories, null, 2)};

export const ITEMS = ${JSON.stringify(items, null, 2)};

export const ITEMS_BY_ID = Object.freeze(
  ITEMS.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {})
);
`;

fs.writeFileSync(outputPath, jsContent, 'utf-8');
console.log(`\x1b[32m✔ Successfully compiled ${items.length} items across ${categories.length} categories to src/data/itemsData.js\x1b[0m`);

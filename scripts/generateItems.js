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
    badge: "bg-slate-800/80 text-slate-300 border-slate-700/80",
    border: "border-slate-800/60 hover:border-slate-700",
    glow: "hover:shadow-slate-500/10",
    accent: "#94a3b8",
    dot: "bg-slate-400"
  },
  Uncommon: {
    badge: "bg-emerald-950/70 text-emerald-300 border-emerald-800/60",
    border: "border-emerald-950/80 hover:border-emerald-700/60",
    glow: "hover:shadow-emerald-500/10",
    accent: "#22c55e",
    dot: "bg-emerald-400"
  },
  Rare: {
    badge: "bg-cyan-950/70 text-cyan-300 border-cyan-800/60",
    border: "border-cyan-950/80 hover:border-cyan-700/60",
    glow: "hover:shadow-cyan-500/10",
    accent: "#06b6d4",
    dot: "bg-cyan-400"
  },
  Epic: {
    badge: "bg-purple-950/70 text-purple-300 border-purple-800/60",
    border: "border-purple-950/80 hover:border-purple-700/60",
    glow: "hover:shadow-purple-500/10",
    accent: "#c084fc",
    dot: "bg-purple-400"
  },
  Legendary: {
    badge: "bg-amber-950/70 text-amber-300 border-amber-800/60",
    border: "border-amber-950/80 hover:border-amber-700/60",
    glow: "hover:shadow-amber-500/10",
    accent: "#f59e0b",
    dot: "bg-amber-400"
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

#!/usr/bin/env node
/**
 * fetchWikiIcons.js
 * 
 * Batch-queries the Minecraft Wiki MediaWiki API to resolve inventory icon
 * URLs for all 1,420 items. Outputs a static lookup map to src/data/itemIcons.js.
 * 
 * Usage:  node scripts/fetchWikiIcons.js
 *    or:  npm run fetch-icons
 * 
 * Requires network access. Run manually (not in sandbox).
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

// ── 1. Load all items from itemsData.js ──────────────────────────────────────

const dataPath = join(ROOT, 'src', 'data', 'itemsData.js');
const dataSrc = readFileSync(dataPath, 'utf-8');

// Extract the ITEMS array using a simple regex approach
const itemsMatch = dataSrc.match(/export const ITEMS = (\[[\s\S]*?\]);/);
if (!itemsMatch) {
  console.error('Could not parse ITEMS from itemsData.js');
  process.exit(1);
}
const items = JSON.parse(itemsMatch[1]);
console.log(`Loaded ${items.length} items from itemsData.js`);

// ── 2. Build candidate wiki file titles for each item ────────────────────────

/**
 * For a given item, return an ordered array of candidate File: titles
 * to look up on the wiki. The first one that resolves wins.
 */
function getCandidateTitles(item) {
  const { name, category } = item;
  const titles = [];

  // Base name: replace spaces with underscores
  const base = name.replace(/\s+/g, '_');

  // Clean name: strip parentheticals like (Long), (Strong), etc.
  const cleanName = name
    .replace(/\(.*?\)/g, '')
    .trim()
    .replace(/\s+/g, '_');

  const catLower = (category || '').toLowerCase();

  // ── Tipped Arrows / Arrows of X ──
  // On the wiki: "Arrow of Night Vision" → Invicon_Arrow_of_Night_Vision.png
  // Long/Strong variants use the same base icon on the wiki
  if (name.startsWith('Arrow of')) {
    const effectClean = name.replace(/\(.*?\)/g, '').trim().replace(/\s+/g, '_');
    titles.push(`Invicon_${effectClean}`);
    // Fallback without Long/Strong
    if (name.includes('(')) {
      const baseEffect = name.replace(/\(.*?\)/g, '').trim().replace(/\s+/g, '_');
      titles.push(`Invicon_${baseEffect}`);
    }
    titles.push('Invicon_Tipped_Arrow');
    return dedup(titles);
  }

  // ── Potions ──
  // "Potion of Night Vision (Long)" → wiki: Invicon_Potion_of_Night_Vision.png
  // Splash/Lingering versions: Invicon_Splash_Potion_of_Night_Vision.png
  if (name.includes('Potion of') || name.includes('Splash Potion of') || name.includes('Lingering Potion of')) {
    const potionClean = name.replace(/\(.*?\)/g, '').trim().replace(/\s+/g, '_');
    titles.push(`Invicon_${potionClean}`);
    // Without (Long)/(Strong)
    if (name.includes('(')) {
      const potionBase = name.replace(/\(.*?\)/g, '').trim().replace(/\s+/g, '_');
      titles.push(`Invicon_${potionBase}`);
    }
    // Generic potion fallback
    if (name.startsWith('Splash Potion')) {
      titles.push('Invicon_Splash_Potion');
    } else if (name.startsWith('Lingering Potion')) {
      titles.push('Invicon_Lingering_Potion');
    } else {
      titles.push('Invicon_Potion');
    }
    return dedup(titles);
  }

  // ── Water Bottle & Mundane/Thick/Awkward Potions ──
  if (name === 'Water Bottle') {
    titles.push('Invicon_Water_Bottle');
    titles.push('Invicon_Potion');
    return dedup(titles);
  }
  if (['Mundane Potion', 'Thick Potion', 'Awkward Potion'].includes(name)) {
    titles.push(`Invicon_${base}`);
    titles.push('Invicon_Potion');
    return dedup(titles);
  }

  // ── Music Discs ──
  // "Music Disc - Cat" → Invicon_Music_Disc_Cat
  // "Music Disc - 13"  → Invicon_Music_Disc_13
  // "Music Disc - Creator (Music Box)" → Invicon_Music_Disc_Creator_(Music_Box)
  if (name.startsWith('Music Disc')) {
    const discPart = name.replace(/^Music Disc\s*-?\s*/, '').replace(/\s+/g, '_');
    if (discPart) {
      titles.push(`Invicon_Music_Disc_${discPart}`);
    }
    titles.push(`Invicon_${base.replace(/-/g, '_').replace(/__+/g, '_')}`);
    titles.push('Invicon_Music_Disc');
    return dedup(titles);
  }

  // ── Pottery Sherds ──
  // "Angler Pottery Sherd" → Invicon_Angler_Pottery_Sherd.png
  if (name.includes('Pottery Sherd')) {
    titles.push(`Invicon_${base}`);
    titles.push('Invicon_Pottery_Sherd');
    return dedup(titles);
  }

  // ── Armor Trims (Smithing Templates) ──
  // "Coast Armor Trim" → wiki uses "Invicon_Coast_Armor_Trim_Smithing_Template"
  if (name.includes('Armor Trim')) {
    titles.push(`Invicon_${base}_Smithing_Template`);
    titles.push(`Invicon_${base}`);
    titles.push('Invicon_Smithing_Template');
    return dedup(titles);
  }

  // ── Smithing Templates ──
  if (name.includes('Smithing Template')) {
    titles.push(`Invicon_${base}`);
    titles.push('Invicon_Smithing_Template');
    return dedup(titles);
  }

  // ── Banner Patterns ──
  if (name.includes('Banner Pattern')) {
    titles.push(`Invicon_${base}`);
    // Try the variant: "Flower Charge Banner Pattern" → might be stored differently
    const patternName = name.replace(' Banner Pattern', '').replace(/\s+/g, '_');
    titles.push(`Invicon_${patternName}_Banner_Pattern`);
    titles.push('Invicon_Banner_Pattern');
    return dedup(titles);
  }

  // ── Spawn Eggs ──
  if (name.includes('Spawn Egg')) {
    titles.push(`Invicon_${base}`);
    return dedup(titles);
  }

  // ── Dyes ──
  // e.g. "Red Dye" → Invicon_Red_Dye
  if (name.endsWith(' Dye') || name === 'Bone Meal' || name === 'Ink Sac' || name === 'Lapis Lazuli' || name === 'Cocoa Beans') {
    titles.push(`Invicon_${base}`);
    return dedup(titles);
  }

  // ── Colored Blocks ──
  // "Light Blue Wool" → Invicon_Light_Blue_Wool
  // These should work directly with Invicon_

  // ── Experience Bottle → "Bottle o' Enchanting" on wiki ──
  if (name === 'Experience Bottle') {
    titles.push("Invicon_Bottle_o'_Enchanting");
    titles.push('Invicon_Experience_Bottle');
    return dedup(titles);
  }

  // ── Dragon's Breath ──
  if (name === "Dragon's Breath") {
    titles.push("Invicon_Dragon's_Breath");
    titles.push('Invicon_Dragons_Breath');
    return dedup(titles);
  }

  // ── General case ──
  // 1. Invicon_{ExactName}
  titles.push(`Invicon_${base}`);
  // 2. If name differs when cleaned, also try cleaned version
  if (cleanName !== base) {
    titles.push(`Invicon_${cleanName}`);
  }
  // 3. Non-invicon version (some items use just the name)
  titles.push(base);

  return dedup(titles);
}

function dedup(arr) {
  return [...new Set(arr)];
}

// ── 3. Batch query the MediaWiki API ─────────────────────────────────────────

const API_URL = 'https://minecraft.wiki/api.php';
const BATCH_SIZE = 50; // MediaWiki allows up to 50 titles per query
const DELAY_MS = 200; // Be polite to the wiki

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Query the wiki API for a batch of File: titles.
 * Returns a map from normalized title → image URL (or null).
 */
async function queryBatch(fileTitles) {
  const titles = fileTitles.map(t => `File:${t}.png`).join('|');
  const params = new URLSearchParams({
    action: 'query',
    titles,
    prop: 'imageinfo',
    iiprop: 'url',
    format: 'json',
    formatversion: '2',
  });

  const url = `${API_URL}?${params}`;
  const resp = await fetch(url);
  if (!resp.ok) {
    console.error(`API error: ${resp.status} ${resp.statusText}`);
    return {};
  }

  const data = await resp.json();
  const result = {};

  if (data.query && data.query.pages) {
    for (const page of data.query.pages) {
      if (!page.missing && page.imageinfo && page.imageinfo.length > 0) {
        // Normalize: "File:Invicon_Stone.png" → "Invicon_Stone"
        const key = page.title.replace(/^File:/, '').replace(/\.png$/, '');
        result[key] = page.imageinfo[0].url;
      }
    }
  }

  return result;
}

// ── 4. Main resolution logic ─────────────────────────────────────────────────

async function main() {
  // Build a master map of all candidate titles we need to check
  const itemCandidates = items.map(item => ({
    id: item.id,
    name: item.name,
    candidates: getCandidateTitles(item),
  }));

  // Collect ALL unique candidate titles
  const allTitles = new Set();
  for (const ic of itemCandidates) {
    for (const t of ic.candidates) {
      allTitles.add(t);
    }
  }

  console.log(`Total unique wiki titles to check: ${allTitles.size}`);

  // Batch query all titles
  const titleArray = [...allTitles];
  const resolvedTitles = {}; // title → URL

  const totalBatches = Math.ceil(titleArray.length / BATCH_SIZE);
  for (let i = 0; i < titleArray.length; i += BATCH_SIZE) {
    const batch = titleArray.slice(i, i + BATCH_SIZE);
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    process.stdout.write(`\r  Querying batch ${batchNum}/${totalBatches} (${batch.length} titles)...`);

    const result = await queryBatch(batch);
    Object.assign(resolvedTitles, result);

    if (i + BATCH_SIZE < titleArray.length) {
      await sleep(DELAY_MS);
    }
  }
  console.log(); // newline after progress

  console.log(`Resolved ${Object.keys(resolvedTitles).length} wiki file titles to URLs`);

  // Now map each item to its best URL
  const iconMap = {};
  let found = 0;
  let missing = 0;
  const missingItems = [];

  for (const ic of itemCandidates) {
    let url = null;
    for (const candidate of ic.candidates) {
      if (resolvedTitles[candidate]) {
        url = resolvedTitles[candidate];
        break;
      }
    }
    if (url) {
      iconMap[ic.id] = url;
      found++;
    } else {
      missing++;
      missingItems.push(ic.name);
    }
  }

  console.log(`\nResults: ${found} found, ${missing} missing`);

  if (missingItems.length > 0 && missingItems.length <= 50) {
    console.log('\nMissing items:');
    missingItems.forEach(name => console.log(`  - ${name}`));
  } else if (missingItems.length > 50) {
    console.log(`\nFirst 50 missing items:`);
    missingItems.slice(0, 50).forEach(name => console.log(`  - ${name}`));
    console.log(`  ... and ${missingItems.length - 50} more`);
  }

  // ── 5. Write output ──────────────────────────────────────────────────────

  const outputPath = join(ROOT, 'src', 'data', 'itemIcons.js');
  const output = `// Auto-generated by scripts/fetchWikiIcons.js
// Run "npm run fetch-icons" to refresh.
// ${found} of ${items.length} items resolved (${(found / items.length * 100).toFixed(1)}% coverage)
// Generated at: ${new Date().toISOString()}

const ITEM_ICONS = ${JSON.stringify(iconMap, null, 2)};

export default ITEM_ICONS;
`;

  writeFileSync(outputPath, output, 'utf-8');
  console.log(`\nWritten to ${outputPath}`);
  console.log(`Coverage: ${(found / items.length * 100).toFixed(1)}%`);

  // ── 6. If there are missing items, try a second pass with alternate names ──

  if (missingItems.length > 0) {
    console.log('\n── Second pass: trying alternate title formats ──');

    // Build alternate candidates for missing items
    const missingCandidates = itemCandidates
      .filter(ic => !iconMap[ic.id])
      .map(ic => {
        const altTitles = [];
        const name = ic.name;
        const base = name.replace(/\s+/g, '_');

        // Try without "Invicon_" prefix (some items use raw names)
        altTitles.push(base);

        // Try ItemCSS_ prefix (some wiki items use this)
        altTitles.push(`ItemCSS_${base}`);

        // Try BlockCSS_ prefix
        altTitles.push(`BlockCSS_${base}`);

        // If name has hyphens, try without
        if (name.includes('-')) {
          const noHyphen = name.replace(/-/g, ' ').trim().replace(/\s+/g, '_');
          altTitles.push(`Invicon_${noHyphen}`);
          altTitles.push(noHyphen);
        }

        // If name has apostrophes or special chars
        if (name.includes("'")) {
          const noApostrophe = name.replace(/'/g, '').replace(/\s+/g, '_');
          altTitles.push(`Invicon_${noApostrophe}`);
        }

        // Armor trims — might be just "Smithing_Template_[Pattern]" format
        if (name.includes('Armor Trim')) {
          const pattern = name.replace(' Armor Trim', '');
          altTitles.push(`Invicon_Smithing_Template_${pattern.replace(/\s+/g, '_')}`);
        }

        // Stained Glass / Stained Glass Pane variants
        if (name.includes('Stained Glass')) {
          altTitles.push(`Invicon_${base}`);
        }

        // Filter out already-tried titles
        const existingSet = new Set(ic.candidates);
        return {
          ...ic,
          altCandidates: altTitles.filter(t => !existingSet.has(t)),
        };
      })
      .filter(ic => ic.altCandidates.length > 0);

    if (missingCandidates.length > 0) {
      const altTitles = new Set();
      for (const ic of missingCandidates) {
        for (const t of ic.altCandidates) {
          altTitles.add(t);
        }
      }

      const altArray = [...altTitles];
      const altBatches = Math.ceil(altArray.length / BATCH_SIZE);
      const altResolved = {};

      for (let i = 0; i < altArray.length; i += BATCH_SIZE) {
        const batch = altArray.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        process.stdout.write(`\r  Alt batch ${batchNum}/${altBatches} (${batch.length} titles)...`);

        const result = await queryBatch(batch);
        Object.assign(altResolved, result);

        if (i + BATCH_SIZE < altArray.length) {
          await sleep(DELAY_MS);
        }
      }
      console.log();

      let altFound = 0;
      for (const ic of missingCandidates) {
        for (const candidate of ic.altCandidates) {
          if (altResolved[candidate]) {
            iconMap[ic.id] = altResolved[candidate];
            altFound++;
            break;
          }
        }
      }

      const totalFound = found + altFound;
      const totalMissing = items.length - totalFound;
      console.log(`Second pass found ${altFound} more icons`);
      console.log(`Final: ${totalFound} found, ${totalMissing} missing (${(totalFound / items.length * 100).toFixed(1)}%)`);

      // List final missing items
      const finalMissing = itemCandidates.filter(ic => !iconMap[ic.id]).map(ic => ic.name);
      if (finalMissing.length > 0 && finalMissing.length <= 100) {
        console.log('\nStill missing:');
        finalMissing.forEach(name => console.log(`  - ${name}`));
      }

      // Re-write with updated data
      const finalOutput = `// Auto-generated by scripts/fetchWikiIcons.js
// Run "npm run fetch-icons" to refresh.
// ${totalFound} of ${items.length} items resolved (${(totalFound / items.length * 100).toFixed(1)}% coverage)
// Generated at: ${new Date().toISOString()}

const ITEM_ICONS = ${JSON.stringify(iconMap, null, 2)};

export default ITEM_ICONS;
`;
      writeFileSync(outputPath, finalOutput, 'utf-8');
      console.log(`\nRe-written to ${outputPath}`);
    }
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

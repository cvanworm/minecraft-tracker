import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { ITEMS } from '../src/data/itemsData.js';
import ITEM_ICONS from '../src/data/itemIcons.js';

const publicRoot = new URL('../public/', import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('item-icons/manifest.json', publicRoot), 'utf8'));

test('every checklist entry has a local icon and matching provenance', () => {
  assert.equal(manifest.resolved, ITEMS.length);
  assert.equal(manifest.total, ITEMS.length);
  assert.deepEqual(manifest.missing, []);
  assert.equal(Object.keys(ITEM_ICONS).length, ITEMS.length);
  const records = new Map(manifest.items.map(item => [item.id, item]));
  for (const item of ITEMS) {
    assert.match(ITEM_ICONS[item.id] ?? '', /^\/item-icons\/[a-z0-9_]+-[a-f0-9]{12}\.png$/);
    assert.equal(records.get(item.id)?.icon, ITEM_ICONS[item.id]);
    assert.ok(records.get(item.id)?.minecraftId);
  }
});

test('every referenced file is a valid 64px RGBA PNG, with no obsolete images', () => {
  const paths = new Set(Object.values(ITEM_ICONS));
  assert.equal(paths.size, manifest.uniqueImages);
  const directory = fileURLToPath(new URL('item-icons/', publicRoot));
  assert.equal(readdirSync(directory).filter(name => name.endsWith('.png')).length, paths.size);
  for (const path of paths) {
    const data = readFileSync(new URL(path.slice(1), publicRoot));
    assert.deepEqual([...data.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(data.toString('ascii', 12, 16), 'IHDR');
    assert.equal(data.readUInt32BE(16), 64, path);
    assert.equal(data.readUInt32BE(20), 64, path);
    assert.equal(data[25], 6, `${path} must preserve transparency`);
  }
});

test('shapes, colors and potion forms retain distinct inventory icons', () => {
  for (const ids of [
    ['stone', 'stone_stairs', 'stone_slab', 'stone_brick_wall'],
    ['white_bed', 'red_bed', 'blue_bed'],
    ['white_banner', 'red_banner', 'blue_banner'],
    ['potion_of_healing', 'splash_potion_of_healing', 'lingering_potion_of_healing'],
    ['potion_of_poison', 'potion_of_healing', 'potion_of_night_vision'],
    ['skeleton_skull', 'wither_skeleton_skull', 'zombie_head', 'creeper_head'],
  ]) {
    assert.ok(ids.every(id => ITEM_ICONS[id]), ids.join(', '));
    assert.equal(new Set(ids.map(id => ITEM_ICONS[id])).size, ids.length);
  }
});

test('duration variants share icons while Turtle Master strength changes its mixed tint', () => {
  assert.equal(ITEM_ICONS.potion_of_poison, ITEM_ICONS.potion_of_poison_long);
  assert.notEqual(ITEM_ICONS.potion_of_the_turtle_master, ITEM_ICONS.potion_of_the_turtle_master_strong);
});

#!/usr/bin/env python3
"""Build local inventory PNGs from a legally installed vanilla client JAR.

Usage: python scripts/extractItemIcons.py path/to/client.jar
Requires Pillow and numpy. No game code is executed or redistributed.
"""
import argparse
import hashlib
import io
import json
import math
import re
import zipfile
from functools import lru_cache
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SIZE = 64
# Vanilla MobEffects RGB constants, read from the 26.2 client class constant pool.
POTION_COLORS = {
    'Night Vision': 0xc2ff66, 'Invisibility': 0xf6f6f6, 'Leaping': 0xfdff84,
    'Fire Resistance': 0xff9900, 'Swiftness': 0x33ebff, 'Slowness': 0x8bafe0,
    'the Turtle Master': 0x734ab3, 'Water Breathing': 0x98dac0,
    'Healing': 0xf82423, 'Harming': 0xa9656a, 'Poison': 0x87a363,
    'Regeneration': 0xcd5cab, 'Strength': 0xffc700, 'Weakness': 0x484d48,
    'Slow Falling': 0xf3cfb9, 'Wind Charging': 0xbdc9ff, 'Weaving': 0x78695a,
    'Oozing': 0x99ffa3, 'Infestation': 0x8c9b8c, 'Splashing': 0x385dc6,
}
DYE_COLORS = dict(zip(
    ['white', 'orange', 'magenta', 'light_blue', 'yellow', 'lime', 'pink', 'gray',
     'light_gray', 'cyan', 'purple', 'blue', 'brown', 'green', 'red', 'black'],
    [0xf9fffe, 0xf9801d, 0xc74ebd, 0x3ab3da, 0xfed83d, 0x80c71f, 0xf38baa,
     0x474f52, 0x9d9d97, 0x169c9c, 0x8932b8, 0x3c44aa, 0x835432, 0x5e7c16,
     0xb02e26, 0x1d1d21]))


def rgb(value):
    return np.array([(value >> 16) & 255, (value >> 8) & 255, value & 255])


def rotation(angles):
    x, y, z = np.radians(angles)
    rx = np.array([[1, 0, 0], [0, math.cos(x), -math.sin(x)], [0, math.sin(x), math.cos(x)]])
    ry = np.array([[math.cos(y), 0, math.sin(y)], [0, 1, 0], [-math.sin(y), 0, math.cos(y)]])
    rz = np.array([[math.cos(z), -math.sin(z), 0], [math.sin(z), math.cos(z), 0], [0, 0, 1]])
    return rz @ ry @ rx


class Assets:
    def __init__(self, path):
        self.jar = zipfile.ZipFile(path)
        self.names = set(self.jar.namelist())
        self.used = set()
        self.version = self.json('version.json')['id']
        lang = self.json('assets/minecraft/lang/en_us.json')
        self.by_name = {v: k.split('.', 2)[2] for k, v in lang.items()
                        if re.fullmatch(r'(item|block)\.minecraft\.[^.]+', k)}

    def read(self, path):
        self.used.add(path)
        return self.jar.read(path)

    def json(self, path):
        return json.loads(self.read(path))

    @lru_cache(None)
    def model(self, name):
        name = name.removeprefix('minecraft:')
        if name.startswith('builtin/'):
            return {'generated': name == 'builtin/generated'}
        raw = self.json(f'assets/minecraft/models/{name}.json')
        parent = self.model(raw['parent']) if 'parent' in raw else {}
        model = {**parent, **raw}
        for field in ['textures', 'display']:
            model[field] = {**parent.get(field, {}), **raw.get(field, {})}
        return model

    @lru_cache(None)
    def texture(self, name):
        name = name.removeprefix('minecraft:')
        image = Image.open(io.BytesIO(self.read(f'assets/minecraft/textures/{name}.png'))).convert('RGBA')
        # Inventory icons use the first animation frame, not the full vertical strip.
        meta_path = f'assets/minecraft/textures/{name}.png.mcmeta'
        if meta_path in self.names:
            meta = self.json(meta_path).get('animation', {})
            width = meta.get('width', image.width)
            height = meta.get('height', width)
            frames = meta.get('frames', [0])
            frame = frames[0] if frames else 0
            frame = frame.get('index', 0) if isinstance(frame, dict) else frame
            cols = max(1, image.width // width)
            x, y = frame % cols * width, frame // cols * height
            image = image.crop((x, y, x + width, y + height))
        return image

    def resolve_texture(self, value, textures):
        seen = set()
        if isinstance(value, str) and value in textures:
            value = '#' + value
        while isinstance(value, str) and value.startswith('#'):
            if value in seen:
                raise ValueError(f'Circular texture reference: {value}')
            seen.add(value)
            value = textures[value[1:]]
        return value['sprite'] if isinstance(value, dict) else value

    def item_id(self, name):
        if 'Potion' in name or 'Water Bottle' in name:
            return 'splash_potion' if name.startswith('Splash') else 'lingering_potion' if name.startswith('Lingering') else 'potion'
        if name.startswith('Arrow of '):
            return 'tipped_arrow'
        if name.startswith('Music Disc - '):
            disc = name.removeprefix('Music Disc - ').lower().replace(' (music box)', '_music_box')
            return 'music_disc_' + disc
        if name.endswith(' Armor Trim'):
            return name.removesuffix(' Armor Trim').lower().replace('raisers', 'raiser') + '_armor_trim_smithing_template'
        if name.endswith(' Banner Pattern'):
            pattern = name.removesuffix(' Banner Pattern').replace(' Charge', '').lower().replace(' ', '_')
            return {'thing': 'mojang', 'snout': 'piglin'}.get(pattern, pattern) + '_banner_pattern'
        aliases = {'Ender Eye': 'ender_eye', 'Experience Bottle': 'experience_bottle',
                   'Disc Fragment 5': 'disc_fragment_5', 'Netherite Upgrade Smithing Template': 'netherite_upgrade_smithing_template', 'Chain': 'iron_chain'}
        return aliases.get(name, self.by_name.get(name))

    def tint(self, tint, name):
        kind = tint.get('type', '').removeprefix('minecraft:')
        if kind == 'potion':
            effect = re.sub(r' \(.*\)', '', name).split(' of ', 1)[-1]
            if effect == 'the Turtle Master':
                # Slowness IV + Resistance III (or VI + IV for Strong).
                a, b = (7, 5) if '(Strong)' in name else (5, 4)
                return ((rgb(0x8bafe0) * a + rgb(0x9146f0) * b) / (a + b)).astype(int)
            return rgb(POTION_COLORS.get(effect, 0x385dc6))
        if kind == 'grass':
            return np.array(self.texture('colormap/grass'))[127, 127, :3]
        if kind == 'firework':
            return rgb(0x8a8a8a)
        return rgb(tint.get('value', tint.get('default', 0xffffff)))

    def nodes(self, node):
        kind = node['type'].removeprefix('minecraft:')
        if kind in ['model', 'special']:
            return [node]
        if kind == 'composite':
            result = []
            for child in node['models']:
                result.extend(self.nodes(child))
            return result
        if kind == 'condition':
            return self.nodes(node['on_false'])
        if kind == 'select':
            if node.get('property') == 'minecraft:display_context':
                for case in node['cases']:
                    if 'gui' in case['when']:
                        return self.nodes(case['model'])
            return self.nodes(node['fallback'])
        if kind == 'range_dispatch':
            return self.nodes(node.get('fallback', node['entries'][0]['model']))
        raise ValueError(f'Unsupported item node: {kind}')

    def render(self, game_id, name):
        path = f'assets/minecraft/items/{game_id}.json'
        if path in self.names:
            nodes = self.nodes(self.json(path)['model'])
        else:
            nodes = [{'type': 'minecraft:model', 'model': 'minecraft:item/' + game_id}]
        flat = Image.new('RGBA', (SIZE, SIZE))
        geometries = []
        for node in nodes:
            tints = [self.tint(t, name) for t in node.get('tints', [])]
            if node['type'] == 'minecraft:special':
                model = self.special(node, game_id)
            else:
                model = self.model(node['model'])
            if model.get('generated'):
                textures = model.get('textures', {})
                for key in sorted(k for k in textures if re.fullmatch('layer[0-9]+', k)):
                    layer = self.texture(self.resolve_texture(textures[key], textures)).copy()
                    index = int(key[5:])
                    if index < len(tints):
                        data = np.array(layer)
                        data[:, :, :3] = (data[:, :, :3].astype(float) * tints[index] / 255).astype('uint8')
                        layer = Image.fromarray(data)
                    flat.alpha_composite(layer.resize((SIZE, SIZE), Image.Resampling.NEAREST))
            elif model.get('elements'):
                geometries.append((model, tints, node.get('transformation', {}) if node['type'] != 'minecraft:special' else {}))
            else:
                raise ValueError(f'No inventory geometry: {game_id}')
        if geometries:
            flat.alpha_composite(self.render_geometry(geometries))
        if not flat.getbbox():
            raise ValueError(f'Empty icon: {game_id}')
        return flat

    def special(self, node, game_id):
        """Approximate built-in entity renderers with cuboids and vanilla atlas UVs."""
        spec = node['model']
        kind = spec['type'].removeprefix('minecraft:')
        model = {'display': {'gui': {'rotation': [25, 225, 0], 'scale': [.8] * 3}}, 'elements': [], 'textures': {}}

        def box(lo, hi, texture, uv_origin=(0, 0), tint=None):
            # ModelPart's unfolded cuboid layout (UV pixel units, converted to model units).
            w, h, d = np.array(hi) - lo
            u, v = uv_origin
            rects = {'west': [u, v+d, u+d, v+d+h], 'north': [u+d, v+d, u+d+w, v+d+h],
                     'east': [u+d+w, v+d, u+2*d+w, v+d+h], 'south': [u+2*d+w, v+d, u+2*d+2*w, v+d+h],
                     'up': [u+d, v, u+d+w, v+d], 'down': [u+d+w, v, u+d+2*w, v+d]}
            tex = self.texture(texture)
            faces = {face: {'texture': texture, 'uv': (np.array(rect) * ([16/tex.width, 16/tex.height]*2)).tolist()}
                     for face, rect in rects.items()}
            if tint is not None:
                for face in faces.values():
                    face['tintindex'] = 0
                model['special_tint'] = rgb(tint)
            model['elements'].append({'from': lo, 'to': hi, 'faces': faces})

        if kind == 'chest':
            texture = 'entity/chest/' + spec.get('texture', 'normal').removeprefix('minecraft:')
            box([1, 0, 1], [15, 10, 15], texture, (0, 19))
            box([1, 10, 1], [15, 15, 15], texture)
            box([7, 7, 0], [9, 11, 1], texture, (0, 0))
        elif kind == 'shulker_box':
            color = spec.get('texture', 'shulker').removeprefix('minecraft:')
            texture = 'entity/shulker/' + color
            box([0, 0, 0], [16, 8, 16], texture, (0, 28))
            box([0, 5, 0], [16, 16, 16], texture)
        elif kind == 'banner':
            texture = 'entity/banner/banner_base'
            box([7, -5, 7], [9, 23, 9], texture, (44, 0))
            box([-2, 21, 7], [18, 23, 9], texture, (0, 42))
            box([-2, -18, 6], [18, 22, 7], texture, (0, 0), DYE_COLORS[spec['color']])
            model['display']['gui'] = {'rotation': [5, 165, 0], 'scale': [.35]*3, 'translation': [0, 2, 0]}
        elif kind == 'shield':
            texture = 'entity/shield/shield_base_nopattern'
            box([2, -3, 7], [14, 19, 8], texture)
            box([7, 4, 8], [9, 10, 14], texture, (26, 0))
            model['display']['gui'] = {'rotation': [15, 155, -5], 'scale': [.65]*3}
        elif kind == 'head':
            head = spec['kind']
            paths = {'skeleton': 'skeleton/skeleton', 'wither_skeleton': 'skeleton/wither_skeleton',
                     'zombie': 'zombie/zombie', 'creeper': 'creeper/creeper', 'piglin': 'piglin/piglin',
                     'dragon': 'enderdragon/dragon'}
            texture = 'entity/' + paths[head]
            if head == 'dragon':
                box([0, 0, 0], [16, 16, 16], texture, (112, 30))
                box([2, 0, -16], [14, 5, 0], texture, (176, 65))
                box([2, 5, -16], [14, 10, 0], texture, (176, 44))
                for x in [2, 12]:
                    box([x, 16, 3], [x+2, 20, 7], texture, (0, 0))
                model['display']['gui']['scale'] = [.45]*3
            else:
                box([4, 4, 4], [12, 12, 12], texture)
                model['display']['gui']['scale'] = [1.25]*3
                if head == 'piglin':
                    box([6, 4, 2], [10, 7, 4], texture, (16, 16))
                    box([2, 6, 6], [4, 11, 7], texture, (51, 6))
                    box([12, 6, 6], [14, 11, 7], texture, (51, 6))
        elif kind == 'conduit':
            box([5, 5, 5], [11, 11, 11], 'entity/conduit/base')
            model['display']['gui']['scale'] = [1.5]*3
        elif kind == 'decorated_pot':
            texture = 'entity/decorated_pot/decorated_pot_side'
            for lo, hi in [([1, 0, 1], [15, 13, 15]), ([5, 13, 5], [11, 16, 11])]:
                model['elements'].append({'from': lo, 'to': hi, 'faces': {f: {'texture': texture, 'uv': [0, 0, 16, 16]} for f in ['up', 'down', 'north', 'south', 'east', 'west']}})
        else:
            raise ValueError(f'Unsupported special model: {kind} ({game_id})')
        return model

    def render_geometry(self, geometries):
        faces_to_draw = []
        for model, tints, transformation in geometries:
            if 'special_tint' in model:
                tints = [model['special_tint']]
            gui = model.get('display', {}).get('gui', {})
            # Minecraft composes GUI rotations as X * Y * Z.
            ang = gui.get('rotation', [30, 225, 0])
            matrix = rotation([ang[0], 0, 0]) @ rotation([0, ang[1], 0]) @ rotation([0, 0, ang[2]])
            scale = np.array(gui.get('scale', [.625]*3))
            offset = np.array(gui.get('translation', [0, 0, 0]))
            shift = np.array(transformation.get('translation', [0, 0, 0])) * 16
            for element in model['elements']:
                x0, y0, z0 = element['from']; x1, y1, z1 = element['to']
                vertices = {
                    'north': [[x1,y1,z0],[x0,y1,z0],[x0,y0,z0],[x1,y0,z0]],
                    'south': [[x0,y1,z1],[x1,y1,z1],[x1,y0,z1],[x0,y0,z1]],
                    'west': [[x0,y1,z0],[x0,y1,z1],[x0,y0,z1],[x0,y0,z0]],
                    'east': [[x1,y1,z1],[x1,y1,z0],[x1,y0,z0],[x1,y0,z1]],
                    'up': [[x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1]],
                    'down': [[x0,y0,z1],[x1,y0,z1],[x1,y0,z0],[x0,y0,z0]],
                }
                for face, data in element['faces'].items():
                    points = np.array(vertices[face], dtype=float)
                    rot = element.get('rotation')
                    if rot:
                        angles = [0,0,0]; axis = 'xyz'.index(rot['axis']); angles[axis] = rot['angle']
                        origin = np.array(rot['origin'])
                        points = (points-origin) @ rotation(angles).T
                        if rot.get('rescale'):
                            factors = np.full(3, 1 / math.cos(math.radians(rot['angle']))); factors[axis] = 1
                            points *= factors
                        points += origin
                    points = ((points + shift - 8) * scale) @ matrix.T + offset
                    normal = -np.cross(points[1]-points[0], points[2]-points[0])
                    if normal[2] <= 0:
                        continue
                    points[:,0] = SIZE/2 + points[:,0] * SIZE/16
                    points[:,1] = SIZE/2 - points[:,1] * SIZE/16
                    uv = data.get('uv')
                    if uv is None:
                        uv = {'down':[x0,16-z1,x1,16-z0], 'up':[x0,z0,x1,z1],
                              'north':[16-x1,16-y1,16-x0,16-y0], 'south':[x0,16-y1,x1,16-y0],
                              'west':[z0,16-y1,z1,16-y0], 'east':[16-z1,16-y1,16-z0,16-y0]}[face]
                    u0,v0,u1,v1 = uv
                    uvs = np.array([[u0,v0],[u1,v0],[u1,v1],[u0,v1]]) / 16
                    uvs = np.roll(uvs, -data.get('rotation', 0)//90, axis=0)
                    texture = np.array(self.texture(self.resolve_texture(data['texture'], model.get('textures', {})))).copy()
                    tint_index = data.get('tintindex', -1)
                    if 0 <= tint_index < len(tints):
                        texture[:,:,:3] = (texture[:,:,:3].astype(float)*tints[tint_index]/255).astype('uint8')
                    # Standard inventory lighting: top bright, two sides distinct.
                    normal = normal / max(np.linalg.norm(normal), 1e-8)
                    shade = 1 if model.get('gui_light') == 'front' or not element.get('shade', True) else .6 + .4*max(0, np.dot(normal, [-.2, .8, .6]))
                    texture[:,:,:3] = (texture[:,:,:3]*min(1,shade)).astype('uint8')
                    faces_to_draw.append((float(points[:,2].mean()), points, uvs, texture))
        canvas = np.zeros((SIZE, SIZE, 4), dtype=float)
        for _, points, uvs, texture in sorted(faces_to_draw, key=lambda f:f[0]):
            # Each face is an affine parallelogram under the orthographic GUI projection.
            basis = np.array([points[1,:2]-points[0,:2], points[3,:2]-points[0,:2]]).T
            if abs(np.linalg.det(basis)) < 1e-8:
                continue
            xmin,ymin = np.maximum(0,np.floor(points[:,:2].min(axis=0))).astype(int)
            xmax,ymax = np.minimum(SIZE,np.ceil(points[:,:2].max(axis=0))).astype(int)
            if xmax<=xmin or ymax<=ymin:
                continue
            yy,xx = np.mgrid[ymin:ymax,xmin:xmax]
            xy = np.stack([xx+.5,yy+.5],axis=-1)
            ab = (xy-points[0,:2]) @ np.linalg.inv(basis).T
            mask = np.all((ab>=0)&(ab<=1),axis=-1)
            uv = uvs[0]+ab[:,:,0,None]*(uvs[1]-uvs[0])+ab[:,:,1,None]*(uvs[3]-uvs[0])
            tx = np.clip((uv[:,:,0]*texture.shape[1]).astype(int),0,texture.shape[1]-1)
            ty = np.clip((uv[:,:,1]*texture.shape[0]).astype(int),0,texture.shape[0]-1)
            source = texture[ty,tx]/255
            alpha = source[:,:,3:4]*mask[:,:,None]
            dest = canvas[ymin:ymax,xmin:xmax]
            out_alpha = alpha+dest[:,:,3:4]*(1-alpha)
            dest[:,:,:3] = np.divide(source[:,:,:3]*alpha+dest[:,:,:3]*dest[:,:,3:4]*(1-alpha),out_alpha,out=np.zeros_like(dest[:,:,:3]),where=out_alpha>0)
            dest[:,:,3:4] = out_alpha
        return Image.fromarray(np.clip(canvas*255,0,255).astype('uint8'))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('jar', type=Path)
    args = parser.parse_args()
    assets = Assets(args.jar)
    items = json.loads(re.search(r'export const ITEMS = (\[[\s\S]*?\]);', (ROOT/'src/data/itemsData.js').read_text(encoding='utf-8')).group(1))
    output = ROOT/'public/item-icons'
    output.mkdir(parents=True, exist_ok=True)
    icons, entries, errors, cache = {}, [], [], {}
    # Generate everything before replacing the lookup: a failed extraction leaves the current map intact.
    for item in items:
        try:
            game_id = assets.item_id(item['name'])
            if not game_id:
                raise ValueError('No matching vanilla item name')
            key = (game_id, re.sub(r' \((Long|Strong)\)', '', item['name']) if game_id in ['potion','splash_potion','lingering_potion','tipped_arrow'] else '')
            if 'the Turtle Master' in item['name']:
                key = (game_id, item['name'].replace(' (Long)', ''))
            if key not in cache:
                image = assets.render(game_id, item['name'])
                digest = hashlib.sha256(image.tobytes()).hexdigest()[:12]
                filename = f'{game_id}-{digest}.png'
                image.save(output/filename, optimize=True)
                cache[key] = '/item-icons/' + filename
            icons[item['id']] = cache[key]
            entries.append({'id': item['id'], 'minecraftId': game_id, 'icon': cache[key]})
        except (KeyError, ValueError) as error:
            errors.append({'id': item['id'], 'name': item['name'], 'error': str(error)})
    print(f'{len(icons)}/{len(items)} entries; {len(set(icons.values()))} unique PNGs; {len(errors)} errors', flush=True)
    if errors:
        print(json.dumps(errors, indent=2))
        raise SystemExit(1)
    report = {'minecraftVersion': assets.version, 'jarSha256': hashlib.sha256(args.jar.read_bytes()).hexdigest(),
              'size': SIZE, 'total': len(items), 'resolved': len(icons), 'uniqueImages': len(set(icons.values())),
              'sourceAssets': sorted(assets.used), 'items': entries, 'missing': errors}
    (output/'manifest.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    (ROOT/'src/data/itemIcons.js').write_text('// Generated from vanilla Minecraft '+assets.version+' by scripts/extractItemIcons.py.\n'
        '// Local inventory icons; see public/item-icons/manifest.json for provenance.\n\n'
        +'const ITEM_ICONS = '+json.dumps(icons,indent=2)+';\n\nexport default ITEM_ICONS;\n',encoding='utf-8')
    # Remove only obsolete PNGs in this generator's filename format.
    active = {Path(url).name for url in icons.values()}
    for path in output.glob('*.png'):
        if re.fullmatch(r'[a-z0-9_]+-[0-9a-f]{12}\.png', path.name) and path.name not in active:
            path.unlink()


if __name__ == '__main__':
    main()

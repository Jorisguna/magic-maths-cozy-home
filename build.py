#!/usr/bin/env python3
"""Build dist/maths-magic.html: one self-contained page (styles, script, every room's image and hotspots inlined).

Usage: python3 build.py
Every folder under rooms/ that holds room.jpg and hotspots.json becomes a room in the picker.
An optional room.json beside them sets: title, order, blurb, intro (Pip's first line), and requires (the room id that must be finished first).
Rooms are sorted by "order", then by folder name. A room with no "requires" is open from the start.
"""
import base64, json, os, sys

here = os.path.dirname(os.path.abspath(__file__))

def read(*parts):
    with open(os.path.join(here, *parts), encoding='utf-8') as f:
        return f.read()

shell = read('src', 'index.template.html')
css = read('src', 'styles.css')
js = read('src', 'game.js')

def load_room(room):
    folder = os.path.join(here, 'rooms', room)
    meta = {}
    meta_path = os.path.join(folder, 'room.json')
    if os.path.exists(meta_path):
        meta = json.load(open(meta_path, encoding='utf-8'))
    title = meta.get('title') or room.replace('-', ' ').title()
    return {
        'id': room,
        'title': title,
        'order': meta.get('order', 999),
        'blurb': meta.get('blurb', ''),
        'intro': meta.get('intro', ''),
        'requires': meta.get('requires', ''),
        'alt': 'A cosy ' + title.lower() + ' inside a huge tree, currently grey and cold',
        'hotspots': json.load(open(os.path.join(folder, 'hotspots.json'), encoding='utf-8')),
        'img': 'data:image/jpeg;base64,' + base64.b64encode(open(os.path.join(folder, 'room.jpg'), 'rb').read()).decode(),
    }

names = sorted(n for n in os.listdir(os.path.join(here, 'rooms'))
               if os.path.exists(os.path.join(here, 'rooms', n, 'room.jpg')))
rooms = sorted((load_room(n) for n in names), key=lambda r: (r['order'], r['id']))
names = [r['id'] for r in rooms]
ids = set(names)
for r in rooms:
    if r['requires'] and r['requires'] not in ids:
        sys.exit(f"Room {r['id']} requires unknown room {r['requires']}")

page = shell.replace('/*__STYLES__*/', css).replace('/*__SCRIPT__*/', js)
page = page.replace('__ROOMS__', json.dumps(rooms))

os.makedirs(os.path.join(here, 'dist'), exist_ok=True)
out = os.path.join(here, 'dist', 'maths-magic.html')
with open(out, 'w', encoding='utf-8') as f:
    f.write(page)
print('Built', out, f'with {len(rooms)} rooms:', ', '.join(names), f'({len(page) / 1024:.0f} KB)')

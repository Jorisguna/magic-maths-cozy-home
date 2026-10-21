#!/usr/bin/env python3
"""Build dist/maths-magic.html: one self-contained page (styles, script, every room's image and hotspots inlined).

Usage: python3 build.py
Every folder under rooms/ that holds room.jpg and hotspots.json becomes a room in the picker.
The treehouse bedroom comes first, the rest in alphabetical order.
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
    title = room.replace('-', ' ').title()
    return {
        'id': room,
        'title': title,
        'alt': 'A cosy ' + title.lower() + ' inside a huge tree, currently grey and cold',
        'hotspots': json.load(open(os.path.join(folder, 'hotspots.json'), encoding='utf-8')),
        'img': 'data:image/jpeg;base64,' + base64.b64encode(open(os.path.join(folder, 'room.jpg'), 'rb').read()).decode(),
    }

names = sorted(n for n in os.listdir(os.path.join(here, 'rooms'))
               if os.path.exists(os.path.join(here, 'rooms', n, 'room.jpg')))
names.sort(key=lambda n: n != 'treehouse-bedroom')
rooms = [load_room(n) for n in names]

page = shell.replace('/*__STYLES__*/', css).replace('/*__SCRIPT__*/', js)
page = page.replace('__ROOMS__', json.dumps(rooms))

os.makedirs(os.path.join(here, 'dist'), exist_ok=True)
out = os.path.join(here, 'dist', 'maths-magic.html')
with open(out, 'w', encoding='utf-8') as f:
    f.write(page)
print('Built', out, f'with {len(rooms)} rooms:', ', '.join(names), f'({len(page) / 1024:.0f} KB)')

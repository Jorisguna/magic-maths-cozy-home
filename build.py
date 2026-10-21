#!/usr/bin/env python3
"""Build dist/maths-magic.html: one self-contained page (styles, script, room image and hotspots inlined).

Usage: python3 build.py [room-folder-name]      (default: treehouse-bedroom)
"""
import base64, json, os, sys

here = os.path.dirname(os.path.abspath(__file__))
room = sys.argv[1] if len(sys.argv) > 1 else 'treehouse-bedroom'

def read(*parts):
    with open(os.path.join(here, *parts), encoding='utf-8') as f:
        return f.read()

shell = read('src', 'index.template.html')
css = read('src', 'styles.css')
js = read('src', 'game.js')
hotspots = json.load(open(os.path.join(here, 'rooms', room, 'hotspots.json'), encoding='utf-8'))
img = base64.b64encode(open(os.path.join(here, 'rooms', room, 'room.jpg'), 'rb').read()).decode()

page = shell.replace('/*__STYLES__*/', css).replace('/*__SCRIPT__*/', js)
page = page.replace('__HOTSPOTS__', json.dumps(hotspots)).replace('__IMG__', 'data:image/jpeg;base64,' + img)

os.makedirs(os.path.join(here, 'dist'), exist_ok=True)
out = os.path.join(here, 'dist', 'maths-magic.html')
with open(out, 'w', encoding='utf-8') as f:
    f.write(page)
print('Built', out, f'({len(page) / 1024:.0f} KB)')

"""L'ultimo passo di ogni scena: dalle forme costruite in Blender ai due file che servono al gioco.

  - public/modelli/<file>.glb           le forme (un oggetto per insieme e per materia), compresse
  - src/mondo/fatte/<nome>Dati.ts       luci, ingombri, caselle occupate, quote di prova, punto d'arrivo del viaggio

Per comprimere serve `gltf-transform` (npm i -g @gltf-transform/cli); se sta altrove, lo si indica con la
variabile GLTF_TRANSFORM. Con la variabile ANTEPRIMA=cartella si salva lì anche il terreno, per guardare la scena
fuori dal gioco."""
import json
import math
import os
import shutil
import subprocess

import bpy

import terreno
from attrezzi import crea_materiali

RADICE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def salva(S, file, imbocco, colore_terreno=(0.09, 0.075, 0.055)):
    nome = terreno.NOME
    fatti = S.costruisci(crea_materiali())
    print('oggetti', len(fatti), 'facce', sum(n for (_, n) in fatti))
    for chi, n in sorted(fatti, key=lambda x: -x[1])[:14]:
        print('  ', chi, n)
    grezzo = os.path.join(RADICE, 'public', 'modelli', f'{file}_grezzo.glb')
    finale = os.path.join(RADICE, 'public', 'modelli', f'{file}.glb')
    scelte = dict(filepath=grezzo, export_format='GLB', export_yup=True, export_apply=False, export_image_format='NONE')
    try:
        bpy.ops.export_scene.gltf(**scelte, export_vertex_color='ACTIVE', export_all_vertex_colors=False, export_active_vertex_color_when_no_material=True)
    except TypeError as errore:
        print('scelte dei colori non accettate, riprovo senza:', errore)
        bpy.ops.export_scene.gltf(**scelte)
    comando = os.environ.get('GLTF_TRANSFORM') or shutil.which('gltf-transform')
    if comando:
        saldato = grezzo.replace('_grezzo', '_saldato')
        subprocess.run([comando, 'weld', grezzo, saldato], check=True, stdout=subprocess.DEVNULL)
        subprocess.run([comando, 'meshopt', saldato, finale], check=True, stdout=subprocess.DEVNULL)
        os.remove(grezzo)
        os.remove(saldato)
    else:
        print('ATTENZIONE: gltf-transform non trovato, la scena resta non compressa')
        os.replace(grezzo, finale)
    print('scena', os.path.getsize(finale) // 1024, 'kb')

    chiavi = sorted((i + 32768) * 65536 + (j + 32768) for (i, j) in S.occupati)
    campioni = []
    passo = terreno.RAGGIO / 62
    for k in range(60):
        a, b = math.cos(k * 2.4) * (k * passo + 3), math.sin(k * 2.4) * (k * passo + 3)
        campioni.append([round(a + terreno.CX, 3), round(b + terreno.CZ, 3), round(terreno.suolo(a, b), 4)])
    dati = {'luci': S.luci, 'urti': S.urti, 'occupati': chiavi, 'campioni': campioni,
            'imbocco': [round(imbocco[0] + terreno.CX, 1), round(imbocco[1] + terreno.CZ, 1)]}
    with open(os.path.join(RADICE, 'src', 'mondo', 'fatte', f'{nome}Dati.ts'), 'w') as f:
        f.write(f'/** Ciò che il gioco deve sapere della scena «{nome}», oltre alle forme: i punti che brillano, gli ingombri, le caselle\n'
                ' * già occupate (lì il bosco non fa nascere piante sue), qualche quota di prova del terreno, dove porta il viaggio.\n'
                f' * Lo scrive strumenti/scene/{nome}.py: non si modifica a mano. */\n'
                "import type { DatiFatta } from './tipi.js';\n\n"
                f"export const {nome.upper()}_DATI = JSON.parse('" + json.dumps(dati, separators=(',', ':')) + "') as DatiFatta;\n")
    print('luci', len(S.luci), 'urti', len(S.urti), 'caselle occupate', len(chiavi))

    cartella = os.environ.get('ANTEPRIMA')
    if cartella:
        for o in list(bpy.data.objects):
            bpy.data.objects.remove(o)
        P = terreno.PASSO
        n = int(terreno.RAGGIO * 2.1 / P)
        vs = [(i * P - n * P / 2, -(j * P - n * P / 2)) for j in range(n + 1) for i in range(n + 1)]
        vs = [(x, y, terreno.terra(x, -y)) for (x, y) in vs]
        fs = [(j * (n + 1) + i, j * (n + 1) + i + 1, (j + 1) * (n + 1) + i + 1, (j + 1) * (n + 1) + i) for j in range(n) for i in range(n)]
        me = bpy.data.meshes.new('terreno')
        me.from_pydata(vs, [], fs)
        m = bpy.data.materials.new('terreno')
        m.use_nodes = True
        m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (*colore_terreno, 1)
        me.materials.append(m)
        bpy.context.collection.objects.link(bpy.data.objects.new('terreno', me))
        bpy.ops.export_scene.gltf(filepath=os.path.join(cartella, f'{nome}_terreno.glb'), export_format='GLB', export_yup=True)

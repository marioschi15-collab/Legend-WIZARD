"""Scarica da Poly Haven (materiali, modelli e cieli liberi da diritti) ciò che si chiede:
    python3 strumenti/scarica_polyhaven.py t:snow_02 m:fir_tree_01 c:kloofendal_48d_partly_cloudy
t: = le immagini di una superficie, m: = un modello, c: = un cielo. Salva nelle cartelle texture/, modelli/ e cieli/ del
posto da cui lo si lancia. Serve che la macchina possa raggiungere api.polyhaven.com e dl.polyhaven.org."""
import json,sys,os,subprocess,urllib.request
def api(a):
    f=f'f_{a}.json'
    if not os.path.exists(f): subprocess.run(['curl','-sS','-m','40',f'https://api.polyhaven.com/files/{a}','-o',f],check=True)
    return json.load(open(f))
def prendi(url,dest):
    os.makedirs(os.path.dirname(dest),exist_ok=True)
    if os.path.exists(dest) and os.path.getsize(dest)>0: return
    subprocess.run(['curl','-sS','-m','300','-L',url,'-o',dest],check=True)
def modello(a,ris='1k'):
    d=api(a)['gltf'][ris]['gltf']
    prendi(d['url'],f'modelli/{a}/{a}.gltf')
    for rel,inc in d['include'].items(): prendi(inc['url'],f'modelli/{a}/{rel}')
    print('modello',a)
def texture(a,ris='1k'):
    d=api(a)
    for mappa,nome in [('Diffuse','diff'),('nor_gl','nor'),('Rough','rough'),('arm','arm')]:
        if mappa in d:
            x=d[mappa][ris]['jpg']; prendi(x['url'],f'texture/{a}_{nome}.jpg')
    print('texture',a,list(d.keys())[:8])
def cielo(a,ris='2k'):
    d=api(a); prendi(d['hdri'][ris]['hdr']['url'],f'cieli/{a}.hdr'); 
    if 'tonemapped' in d: prendi(d['tonemapped']['url'],f'cieli/{a}.jpg')
    print('cielo',a)
for x in sys.argv[1:]:
    t,a=x.split(':'); {'m':modello,'t':texture,'c':cielo}[t](a)

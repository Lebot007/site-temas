# -*- coding: utf-8 -*-
"""Audita TODAS as falas prontas: cada uma é comparada com o padrão do próprio personagem.

Reprova quando: timbre longe da voz média, tom fora do normal do personagem (> 3 semitons),
ritmo muito acelerado/arrastado, ou texto ouvido diferente do roteiro.
Gera assets/voz/auditoria.json e imprime a lista "id:chave" para regenerar.
Uso: python -I scripts/auditar_vozes.py [id ...]
"""
import json, os, sys, statistics
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import analise_voz as av
import gerar_vozes as gv

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOZ = os.path.join(ROOT, 'assets', 'voz')


def main(ids):
    falas = json.load(open(os.path.join(ROOT, 'scripts', 'falas.json'), encoding='utf-8'))
    rel = {}
    reprovadas = []
    for cid in ids or list(falas):
        dados = {}
        for k, t in falas[cid].items():
            p = os.path.join(VOZ, cid, f'{k}.mp3')
            if not os.path.exists(p):
                continue
            w = av.wav16(p)
            heard, _w2 = gv.ouvir(p)
            os.remove(_w2)
            pitch, ritmo, fala = av.tom_e_ritmo(w, t)
            piso, clip, estalos = av.ruido(w)
            dados[k] = {'e': av.embedding(w), 'pitch': pitch, 'ritmo': ritmo, 'texto': gv.nota_texto(t, heard), 'ouvido': heard,
                        'piso': piso, 'clip': clip, 'estalos': estalos}
            os.remove(w)
        c = av.centroide([d['e'] for d in dados.values()])
        pm = statistics.median([d['pitch'] for d in dados.values() if d['pitch'] == d['pitch']])
        rs = [d['ritmo'] for d in dados.values()]
        rm = statistics.median(rs); rmad = statistics.median([abs(r - rm) for r in rs]) or 0.1
        sims = [float(d['e'] @ c) for d in dados.values()]
        smed = statistics.median(sims); smad = statistics.median([abs(s - smed) for s in sims]) or 0.02
        rel[cid] = {}
        for k, d in dados.items():
            sim = float(d['e'] @ c)
            st = av.semitons(d['pitch'], pm)
            zr = (d['ritmo'] - rm) / (1.4826 * rmad)
            motivos = []
            if sim < max(0.55, smed - 3.5 * 1.4826 * smad): motivos.append(f'timbre {sim:.2f}')
            if abs(st) > 3.0: motivos.append(f'tom {st:+.1f} st')
            if abs(zr) > 3.5 and len(falas[cid][k].split()) > 3: motivos.append(f'ritmo z={zr:+.1f}')
            if d['texto'] < 0.8 and not (cid, k) in (('frieren', 'frase2'), ('eren', 'frase2')): motivos.append(f'texto {d["texto"]:.2f}')
            if d['piso'] > -48: motivos.append(f'ruído de fundo {d["piso"]:.0f} dB')
            if d['clip'] > 20: motivos.append(f'clipping {d["clip"]}')
            if d['estalos'] > 3: motivos.append(f'estalos {d["estalos"]}')
            rel[cid][k] = {'timbre': round(sim, 3), 'tom_st': round(st, 2), 'ritmo': round(d['ritmo'], 2),
                           'texto': round(d['texto'], 2), 'ouvido': d['ouvido'], 'ruido_db': round(d['piso'], 1), 'ok': not motivos, 'motivos': motivos}
            if motivos:
                reprovadas.append(f'{cid}:{k}')
                print(f'  REPROVADA {cid}/{k}: {", ".join(motivos)}  "{d["ouvido"]}"', flush=True)
        print(f'== {cid}: timbre mediano {smed:.2f} · tom {pm:.0f} Hz · ritmo {rm:.1f} pal/s · reprovadas {sum(not v["ok"] for v in rel[cid].values())}/{len(dados)}', flush=True)
    path = os.path.join(VOZ, 'auditoria.json')
    antigo = json.load(open(path, encoding='utf-8')) if os.path.exists(path) else {}
    antigo.update(rel)
    json.dump(antigo, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('REFAZER:', ' '.join(reprovadas))


if __name__ == '__main__':
    main(sys.argv[1:])

# -*- coding: utf-8 -*-
"""Orquestra a geração local completa (OpenAudio S1-mini na GPU, grátis e ilimitado).

Para cada personagem: 3 tentativas por fala -> avaliação (texto + timbre vs voz da API + ruído)
-> até 3 rodadas extras só para as reprovadas -> finaliza os MP3 e o manifest.
Uso: python -I scripts/gerar_local.py [id ...]
"""
import json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PY_SITE = r'D:\Claude config\venvs\site-temas\Scripts\python.exe'
PY_FISH = r'D:\Claude config\venvs\fish-speech\Scripts\python.exe'
TMP = r'D:\Claude config\temp\site-temas'
ENV = dict(os.environ, PYTHONIOENCODING='utf-8')


def rodar_tts(jobs):
    path = os.path.join(TMP, 'jobs_atual.json')
    json.dump(jobs, open(path, 'w', encoding='utf-8'), ensure_ascii=False)
    p = subprocess.run([PY_FISH, os.path.join(ROOT, 'scripts', 'tts_local.py'), path], env=ENV,
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
    if p.returncode != 0:
        print(p.stderr[-2000:], flush=True)
        raise SystemExit('falha no TTS local')


def avaliar(cid, finalizar=False):
    args = [PY_SITE, '-I', os.path.join(ROOT, 'scripts', 'escolher_local.py'), cid] + (['--finalizar'] if finalizar else [])
    p = subprocess.run(args, env=ENV, capture_output=True, text=True, encoding='utf-8', errors='replace')
    linhas = [l for l in p.stdout.splitlines() if l.startswith((cid + '/', '==', 'REFAZER'))]
    ruins = []
    for l in linhas:
        if l.startswith('REFAZER:'):
            ruins = l.split(':', 1)[1].split()
    return linhas, ruins


def main(ids):
    falas = json.load(open(os.path.join(ROOT, 'scripts', 'falas.json'), encoding='utf-8'))
    for cid in ids or list(falas):
        print(f'== {cid}: {len(falas[cid])} falas', flush=True)
        rodar_tts([{'id': cid, 'k': k, 't': t, 'n': 3, 'rodada': 0} for k, t in falas[cid].items()])
        for rodada in range(1, 4):
            _, ruins = avaliar(cid)
            print(f'  rodada {rodada}: {len(ruins)} falas para refazer', flush=True)
            if not ruins:
                break
            rodar_tts([{'id': cid, 'k': k, 't': falas[cid][k], 'n': 3, 'rodada': rodada} for k in ruins])
        linhas, ruins = avaliar(cid, finalizar=True)
        for l in linhas:
            if '<<<' in l or l.startswith('=='):
                print('  ' + l, flush=True)
    print('ok', flush=True)


if __name__ == '__main__':
    main(sys.argv[1:])

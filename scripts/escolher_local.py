# -*- coding: utf-8 -*-
"""Etapa 3 da geração local: escolhe a melhor tentativa de cada fala e finaliza o MP3.

Critérios (a mesma régua usada com a API):
  - texto: o Whisper precisa ouvir a frase inteira (e "Lebot" certo);
  - timbre: similaridade com a impressão digital da VOZ DA API do personagem (refs/<id>.npy);
  - ruído de fundo, clipping e estalos.
Imprime as falas reprovadas (para gerar mais tentativas) e atualiza o manifest.
Uso: python -I scripts/escolher_local.py <id> [--finalizar] [--min-voz 0.6]
"""
import glob, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import analise_voz as av
import gerar_vozes as gv

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOCAL = r'D:\Claude config\temp\site-temas\local'
REFS = r'D:\Claude config\temp\site-temas\refs'
CACHE_ANTIGO = os.path.join(LOCAL, '_notas.json')


def notas(cid, falas):
    CACHE = os.path.join(LOCAL, f'_notas_{cid}.json')   # cache por personagem (processos paralelos não colidem)
    cache = json.load(open(CACHE, encoding='utf-8')) if os.path.exists(CACHE) else {}
    if not cache and os.path.exists(CACHE_ANTIGO):
        cache = {k: v for k, v in json.load(open(CACHE_ANTIGO, encoding='utf-8')).items() if f'{os.sep}{cid}{os.sep}' in k or f'/{cid}/' in k}
    c = np.load(os.path.join(REFS, f'{cid}.npy'))
    res = {}
    for f in sorted(glob.glob(os.path.join(LOCAL, cid, '*.wav'))):
        k = os.path.basename(f).split('__')[0]
        if k not in falas:
            continue
        chave = f'{f}|{os.path.getmtime(f)}'
        if chave not in cache:
            w = av.wav16(f)
            heard, w2 = gv.ouvir(f); os.remove(w2)
            piso, clip, estalos = av.ruido(w)
            cache[chave] = {'voz': float(av.embedding(w) @ c), 'texto': gv.nota_texto(falas[k], heard),
                            'ouvido': heard, 'ruido': piso, 'clip': clip, 'estalos': estalos}
            os.remove(w)
            json.dump(cache, open(CACHE, 'w', encoding='utf-8'), ensure_ascii=False)
        res.setdefault(k, []).append(dict(cache[chave], f=f))
    return res


def main():
    cid = sys.argv[1]
    finalizar = '--finalizar' in sys.argv
    min_voz = float(sys.argv[sys.argv.index('--min-voz') + 1]) if '--min-voz' in sys.argv else 0.6
    falas = json.load(open(os.path.join(ROOT, 'scripts', 'falas.json'), encoding='utf-8'))[cid]
    res = notas(cid, falas)
    mpath = os.path.join(ROOT, 'assets', 'voz', 'manifest.json')
    manifest = json.load(open(mpath, encoding='utf-8')) if os.path.exists(mpath) else {}
    ruins, vozes = [], []
    for k in falas:
        ts = res.get(k, [])
        if not ts:
            ruins.append(k); continue
        for t in ts:
            ok_txt = t['texto'] >= 0.85 or k in ('frase_2',) and cid in ('frieren', 'eren')
            limpo = t['ruido'] <= -48 and t['clip'] <= 20   # estalos do áudio cru somem na finalização
            t['nota'] = ok_txt * 2 + limpo * 1 + t['texto'] + 2 * t['voz']
            t['ok'] = ok_txt and limpo and t['voz'] >= min_voz
        best = max(ts, key=lambda t: t['nota'])
        vozes.append(best['voz'])
        flag = '' if best['ok'] else '  <<< REFAZER'
        if not best['ok']:
            ruins.append(k)
        print(f"{cid}/{k}: texto={best['texto']:.2f} voz={best['voz']:.2f} ruído={best['ruido']:.0f}dB ({len(ts)} tent.) \"{best['ouvido'][:70]}\"{flag}")
        if finalizar:
            dst = os.path.join(ROOT, 'assets', 'voz', cid, f'{k}.mp3')
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            gv.finalizar(best['f'], dst)
            manifest.setdefault(cid, {})[k] = {'t': falas[k], 'd': gv.duracao(dst)}
    if finalizar:
        import time
        trava = mpath + '.trava'
        while True:   # trava simples: só um processo grava o manifest por vez
            try:
                fd = os.open(trava, os.O_CREAT | os.O_EXCL | os.O_WRONLY); break
            except FileExistsError:
                time.sleep(0.3)
        try:
            atual = json.load(open(mpath, encoding='utf-8')) if os.path.exists(mpath) else {}
            atual[cid] = manifest[cid]
            json.dump(atual, open(mpath, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        finally:
            os.close(fd); os.unlink(trava)
    if vozes:
        print(f'== {cid}: timbre mediano {sorted(vozes)[len(vozes)//2]:.2f} · reprovadas {len(ruins)}/{len(falas)}')
    print('REFAZER:', ' '.join(ruins))


if __name__ == '__main__':
    main()

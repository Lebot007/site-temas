# -*- coding: utf-8 -*-
"""Etapa 1 da geração local: monta a voz de referência de cada personagem.

Usa os áudios que a API da Fish Audio já gerou (modelos oficiais de cada voz):
escolhe os trechos mais fiéis ao timbre médio, confere o texto com Whisper e junta ~12 s
de referência + transcrição. Salva também a "impressão digital" (embedding ECAPA) da voz da API,
usada depois para avaliar se a voz local continua parecida.

Saída: D:\\Claude config\\temp\\site-temas\\refs\\<id>.wav, <id>.txt, <id>.npy
Uso: python -I scripts/preparar_referencias.py [id ...]
"""
import glob, json, os, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import analise_voz as av
import gerar_vozes as gv

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ANTIGOS = r'D:\Claude config\temp\site-temas\voz'      # tentativas da 1ª geração via API
REFS = r'D:\Claude config\temp\site-temas\refs'
os.makedirs(REFS, exist_ok=True)


def candidatos(cid):
    fs = sorted(glob.glob(os.path.join(ANTIGOS, f'{cid}_*.wav')))
    fs = [f for f in fs if not f.endswith('.16k.wav')]
    fs += sorted(glob.glob(os.path.join(ROOT, 'assets', 'voz', cid, '*.mp3')))
    return fs


def main(ids):
    todos = ['capri', 'sukuna', 'kaneki', 'frieren', 'emilia', 'beatrice', 'rem', 'eren', 'thorfinn', 'gojo']
    for cid in ids or todos:
        fs = candidatos(cid)
        itens = []
        for f in fs:
            w = av.wav16(f)
            try:
                import soundfile as sf
                dur = sf.info(w).duration
                if dur < 1.5:
                    continue
                itens.append({'f': f, 'w': w, 'dur': dur, 'e': av.embedding(w)})
            except Exception:
                pass
        c = av.centroide([i['e'] for i in itens])
        np.save(os.path.join(REFS, f'{cid}.npy'), c)
        for i in itens:
            i['sim'] = float(i['e'] @ c)
        itens.sort(key=lambda i: -i['sim'])
        escolhidos, total, textos = [], 0.0, []
        for i in itens:
            if total >= 12 or len(escolhidos) >= 4:
                break
            if not (2.0 <= i['dur'] <= 7.0):
                continue
            heard, w2 = gv.ouvir(i['f'])
            os.remove(w2)
            heard = heard.strip()
            if len(heard.split()) < 3:
                continue
            escolhidos.append(i); textos.append(heard); total += i['dur']
        # junta os trechos com 0,35 s de pausa
        lista = os.path.join(REFS, f'{cid}_lista.txt')
        sil = os.path.join(REFS, 'silencio.wav')
        if not os.path.exists(sil):
            subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono', '-t', '0.35', sil], check=True)
        partes = []
        for n, i in enumerate(escolhidos):
            p = os.path.join(REFS, f'{cid}_parte{n}.wav')
            subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', i['f'], '-ar', '44100', '-ac', '1', p], check=True)
            partes += [p, sil]
        open(lista, 'w', encoding='utf-8').write(''.join(f"file '{p}'\n" for p in partes[:-1]))
        subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', lista, '-c', 'copy',
                        os.path.join(REFS, f'{cid}.wav')], check=True)
        open(os.path.join(REFS, f'{cid}.txt'), 'w', encoding='utf-8').write(' '.join(textos))
        for i in itens:
            try: os.remove(i['w'])
            except OSError: pass
        print(f'== {cid}: {len(itens)} amostras · referência {total:.1f}s · timbre {[round(i["sim"], 2) for i in escolhidos]}', flush=True)
        print('   texto:', ' '.join(textos)[:160], flush=True)


if __name__ == '__main__':
    main(sys.argv[1:])

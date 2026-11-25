# -*- coding: utf-8 -*-
"""Etapa 2 da geração local: gera as falas no OpenAudio S1-mini (Fish Audio, roda na GPU, grátis).

Clona a voz a partir da referência montada pela etapa 1 (áudios da API oficial).
Parâmetros no padrão do modelo (sem forçar). Salva N tentativas por fala.
Roda com o venv do fish-speech:
  "D:\\Claude config\\venvs\\fish-speech\\Scripts\\python.exe" scripts/tts_local.py <jobs.json>
jobs.json = [{"id": "gojo", "k": "ola_1", "t": "texto", "n": 3}, ...]
"""
import json, os, sys, time
import numpy as np

FS = r'D:\Claude config\tools\fish-speech-s1'
MODELO = r'D:\Claude config\modelos\openaudio-s1-mini'
REFS = r'D:\Claude config\temp\site-temas\refs'
SAIDA = r'D:\Claude config\temp\site-temas\local'
sys.path.insert(0, FS)
os.chdir(FS)

import torch
import soundfile as sf
from fish_speech.inference_engine import TTSInferenceEngine
from fish_speech.models.dac.inference import load_model as load_decoder_model
from fish_speech.models.text2semantic.inference import launch_thread_safe_queue
from fish_speech.utils.schema import ServeTTSRequest, ServeReferenceAudio

PRONUNCIA = [('Lebot', 'Lebót')]


def motor():
    prec = torch.bfloat16
    q = launch_thread_safe_queue(checkpoint_path=MODELO, device='cuda', precision=prec, compile=False)
    dec = load_decoder_model(config_name='modded_dac_vq', checkpoint_path=os.path.join(MODELO, 'codec.pth'), device='cuda')
    return TTSInferenceEngine(llama_queue=q, decoder_model=dec, compile=False, precision=prec)


def falar(eng, ref, texto, seed):
    for a, b in PRONUNCIA:
        texto = texto.replace(a, b)
    req = ServeTTSRequest(text=texto, references=[ref], reference_id=None, max_new_tokens=1024, chunk_length=200,
                          top_p=0.7, repetition_penalty=1.2, temperature=0.7, format='wav', seed=seed,
                          use_memory_cache='on')
    sr, audio = None, []
    for r in eng.inference(req):
        if r.code == 'error':
            raise r.error
        if r.code == 'final' and r.audio is not None:
            sr, a = r.audio
            audio.append(a)
    return sr, np.concatenate(audio) if audio else None


def main(jobs_path):
    jobs = json.load(open(jobs_path, encoding='utf-8'))
    eng = motor()
    refs = {}
    t0 = time.time()
    for n, j in enumerate(jobs):
        cid = j['id']
        if cid not in refs:
            refs[cid] = ServeReferenceAudio(audio=open(os.path.join(REFS, f'{cid}.wav'), 'rb').read(),
                                            text=open(os.path.join(REFS, f'{cid}.txt'), encoding='utf-8').read())
        os.makedirs(os.path.join(SAIDA, cid), exist_ok=True)
        for t in range(j.get('n', 3)):
            out = os.path.join(SAIDA, cid, f"{j['k']}__{j.get('rodada', 0)}_{t}.wav")
            if os.path.exists(out):
                continue
            seed = 1000 * j.get('rodada', 0) + 17 * t + 7
            sr, a = falar(eng, refs[cid], j['t'], seed)
            if a is not None:
                sf.write(out, a, sr)
        print(f"[{n + 1}/{len(jobs)}] {cid}/{j['k']}  ({time.time() - t0:.0f}s)", flush=True)
    print('ok')


if __name__ == '__main__':
    main(sys.argv[1])
